require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { initDB, getPricing, DEFAULT_PRICING } = require("./db");
const { runGenerationCycle } = require("./engine");
const { generatePost, critiquePost, pickStyleExamples } = require("./deepseek");
const { startAutomation, stopAutomation, resumeAllAutomations } = require("./scheduler");
const { publishToChannels } = require("./channels");
const { createNonce, verifyAndIssueToken, requireAuth, getPendingRef } = require("./auth");
const { createDepositIntent, getIntentStatus, pollForDeposits, confirmDepositByTxHash } = require("./deposits");
const { getBalance } = require("./supraClient");
const { requestWithdrawal, listAllPending, listAllHistory, markWithdrawal } = require("./withdrawals");
const { cleanOldImages, IMAGES_DIR } = require("./imageGen");

const PORT = process.env.PORT || 3001;
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

/**
 * Strips credential secrets before sending channel state to the frontend.
 * The UI only needs to know a channel IS configured, not see the token.
 */
const CHANNEL_META = {
  telegram:  { name: "Telegram",    icon: "✈",  color: "#34b7eb" },
  discord:   { name: "Discord",     icon: "🎮", color: "#5865F2" },
  twitter:   { name: "Twitter / X", icon: "𝕏",  color: "#1d9bf0" },
  instagram: { name: "Instagram",   icon: "📷", color: "#E1306C" },
};

function maskChannels(channels) {
  const out = {};
  for (const [id, ch] of Object.entries(channels)) {
    const hasCreds = ch.credentials && Object.values(ch.credentials).some(Boolean);
    const meta = CHANNEL_META[id] || { name: id, icon: "●", color: "#5f5783" };
    out[id] = {
      id,
      name:       meta.name,
      icon:       meta.icon,
      color:      meta.color,
      label:      ch.label || meta.name,
      enabled:    !!ch.enabled,
      configured: !!(ch.connected || hasCreds),
      connected:  !!(ch.connected || hasCreds),
      comingSoon: false,
    };
  }
  return out;
}

async function main() {
  const db = await initDB();

  // Clean up images older than 7 days on startup
  cleanOldImages(7);

  const app = express();
  // Allow requests from Vercel frontend and local dev
  const allowedOrigins = [
    process.env.FRONTEND_URL,        // e.g. https://suprapost.vercel.app
    "http://localhost:5173",          // local Vite dev
    "http://localhost:3001",          // local production build
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // In dev mode allow all
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "20mb" })); // generous limit for base64 image uploads

  // Never let a CDN/tunnel/browser cache API responses — wallet balance,
  // automation state, etc. must always be fresh. Static assets (images,
  // the built frontend if served from here) are unaffected since this only
  // touches /api/*.
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });


  // Serve generated/uploaded images so Discord embeds and previews work
  app.use("/images", express.static(IMAGES_DIR));

  // No-cache on all /api responses — stops Cloudflare tunnel caching stale data
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // ── Resume automation for every user who had it running ──
  resumeAllAutomations(db);

  // ── Poll for incoming SUPRA deposits every 20s, if a deposit address
  // is configured. This is what turns a pending deposit intent into a
  // credited balance, without ever holding the user's private key. ──
  if (process.env.SUPRA_DEPOSIT_ADDRESS) {
    setInterval(() => {
      pollForDeposits(db).catch((err) => console.error("[deposits] Poll error:", err.message));
    }, 20000);
    console.log(`[server] Watching for deposits to ${process.env.SUPRA_DEPOSIT_ADDRESS}`);
  } else {
    console.log("[server] SUPRA_DEPOSIT_ADDRESS not set — real deposits disabled, dev top-up only");
  }

  // ════════════════════════════════════════════════════════
  // AUTH — wallet-based sign-in (no passwords, no emails)
  //
  // Flow: frontend connects StarKey -> gets address -> requests a nonce ->
  // signs the nonce message with the wallet -> sends signature back ->
  // backend verifies it was really signed by that address's key -> issues
  // a JWT the frontend then sends as "Authorization: Bearer <token>" on
  // every other request.
  // ════════════════════════════════════════════════════════
  app.post("/api/auth/nonce", (req, res) => {
    const { address, ref } = req.body;
    if (!address) return res.status(400).json({ ok: false, error: "Missing wallet address" });
    const message = createNonce(address, ref); // pass referrer to store temporarily
    res.json({ ok: true, message });
  });

  app.post("/api/auth/verify", async (req, res) => {
    const { address, signature, publicKey } = req.body;
    if (!address || !signature) return res.status(400).json({ ok: false, error: "Missing address or signature" });
    const result = await verifyAndIssueToken(address, signature, publicKey);
    if (!result.ok) return res.status(401).json(result);

    // Register referral on first ever login
    await db.read();
    const normalised = address.toLowerCase().replace(/^0x/, "");
    const user = db.forUser(normalised);
    const pendingRef = getPendingRef(normalised);

    if (pendingRef && !user.referral?.referredBy) {
      const refNorm = pendingRef.toLowerCase().replace(/^0x/, "");
      if (refNorm !== normalised) { // can't refer yourself
        user.referral = user.referral || {};
        user.referral.referredBy = refNorm;
        // Add to referrer's list
        const referrer = db.forUser(refNorm);
        referrer.referral = referrer.referral || {};
        referrer.referral.referrals = referrer.referral.referrals || [];
        if (!referrer.referral.referrals.includes(normalised)) {
          referrer.referral.referrals.push(normalised);
        }
        await db.write();
        console.log(`[referral] ${normalised} referred by ${refNorm}`);
      }
    }

    const admin = (process.env.SUPRA_DEPOSIT_ADDRESS || "").replace(/^0x/, "").toLowerCase();
    result.isAdmin = !!admin && normalised === admin;

    res.json(result);
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const admin = (process.env.SUPRA_DEPOSIT_ADDRESS || "").replace(/^0x/, "").toLowerCase();
    const isAdmin = !!admin && req.walletAddress.replace(/^0x/, "").toLowerCase() === admin;
    res.json({ ok: true, address: req.walletAddress, isAdmin });
  });

  // ── REFERRAL ─────────────────────────────────────────────────────────────
  app.get("/api/referral", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const referral = user.referral || {};
    res.json({
      ok: true,
      referredBy: referral.referredBy || null,
      referralEarned: referral.referralEarned || 0,
      referralCount: (referral.referrals || []).length,
    });
  });

  // ── Everything below this line requires a valid wallet session.
  // We apply requireAuth per-route (not as global middleware) so that
  // /api/auth/*, /api/health, and the frontend static files stay public. ──

  // ════════════════════════════════════════════════════════
  // SETTINGS — content profile (niche, tone, audience, etc.)
  // ════════════════════════════════════════════════════════
  app.get("/api/settings", requireAuth, async (req, res) => {
    await db.read();
    res.json(db.forUser(req.walletAddress).settings);
  });

  app.post("/api/settings", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    user.settings = { ...user.settings, ...req.body };
    await db.write();
    res.json(user.settings);
  });

  // ════════════════════════════════════════════════════════
  // WALLET — balance, top-up
  // ════════════════════════════════════════════════════════

  // GET /api/wallet — returns the platform's internal balance (credits).
  //
  // IMPORTANT: the internal balance is SEPARATE from the user's on-chain balance.
  // When a user makes a deposit, they send SUPRA to the platform address
  // and we credit the equivalent to the internal balance. The user's on-chain balance
  // is not our balance — it doesn't make sense to read it here.
  //
  // ALLOW_SIMULATED_TOPUP=true → dev mode, free internal balance
  // otherwise                    → real internal balance (credited via deposits)
  app.get("/api/wallet", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    // Returns the internal balance directly — never overwritten with the on-chain balance
    res.json(user.wallet);
  });

  // POST /api/wallet/topup — DEV ONLY (ALLOW_SIMULATED_TOPUP=true)
  // Adds balance without a real transaction. Never expose in production.
  if (process.env.ALLOW_SIMULATED_TOPUP === "true") {
    app.post("/api/wallet/topup", requireAuth, async (req, res) => {
      await db.read();
      const user = db.forUser(req.walletAddress);

      // Validate: must be a positive number with at most 10 decimal places
      const raw = String(req.body.amount ?? "");
      const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
      if (decimals > 8) {
        return res.status(400).json({ ok: false, error: "Amount cannot have more than 8 decimal places (SUPRA precision)." });
      }
      const amount = Number(raw);
      if (!amount || amount <= 0 || !isFinite(amount)) {
        return res.status(400).json({ ok: false, error: "Invalid amount." });
      }

      user.wallet.balance = +(user.wallet.balance + amount).toFixed(8);
      await db.write();
      res.json(user.wallet);
    });
  }

  // GET /api/wallet/deposits — user's deposit history
  app.get("/api/wallet/deposits", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const deposits = Array.isArray(user.wallet.deposits) ? user.wallet.deposits : [];
    res.json({ ok: true, deposits });
  });

  // POST /api/wallet/withdraw — cash out referral credits only (never deposited balance)
  app.post("/api/wallet/withdraw", requireAuth, async (req, res) => {
    const { amount, toAddress } = req.body;
    const result = await requestWithdrawal(db, req.walletAddress, amount, toAddress);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  // GET /api/wallet/withdrawals — withdrawal request history
  app.get("/api/wallet/withdrawals", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    res.json({ ok: true, withdrawals: user.wallet.withdrawals || [] });
  });

  // ── Admin: manual withdrawal payouts ──
  // Only the platform's own deposit wallet counts as admin — no separate secret needed.
  function isAdminAddress(address) {
    const admin = (process.env.SUPRA_DEPOSIT_ADDRESS || "").replace(/^0x/, "").toLowerCase();
    return !!admin && (address || "").replace(/^0x/, "").toLowerCase() === admin;
  }
  function requireAdmin(req, res, next) {
    if (!isAdminAddress(req.walletAddress)) return res.status(403).json({ ok: false, error: "Forbidden" });
    next();
  }

  // ── PRICING — public read, admin write ──────────────────────────────────
  app.get("/api/pricing", async (req, res) => {
    await db.read();
    res.json({ ok: true, pricing: getPricing(db) });
  });

  app.post("/api/admin/pricing", requireAuth, requireAdmin, async (req, res) => {
    const { text, image, both } = req.body;
    await db.read();
    db.data.pricing = {
      text:  Math.max(0.1, Number(text)  || DEFAULT_PRICING.text),
      image: Math.max(0.1, Number(image) || DEFAULT_PRICING.image),
      both:  Math.max(0.1, Number(both)  || DEFAULT_PRICING.both),
    };
    await db.write();
    console.log("[admin] Pricing updated:", db.data.pricing);
    res.json({ ok: true, pricing: db.data.pricing });
  });

  app.get("/api/admin/withdrawals", requireAuth, requireAdmin, async (req, res) => {
    await db.read();
    res.json({ ok: true, withdrawals: listAllPending(db) });
  });

  app.get("/api/admin/withdrawals/history", requireAuth, requireAdmin, async (req, res) => {
    await db.read();
    res.json({ ok: true, withdrawals: listAllHistory(db) });
  });

  app.post("/api/admin/withdrawals/:address/:id", requireAuth, requireAdmin, async (req, res) => {
    const { status, txHash } = req.body; // status: "paid" | "rejected"
    if (!["paid", "rejected"].includes(status)) return res.status(400).json({ ok: false, error: "status must be paid or rejected" });
    const result = await markWithdrawal(db, req.params.address, req.params.id, status, txHash);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  // GET /api/admin/reconciliation — sanity check: what the DB thinks users
  // deposited in total vs. what's actually sitting in the platform's
  // on-chain deposit address right now (minus paid-out withdrawals). A
  // large, unexplained gap here means something is wrong — a bug, a missed
  // deposit, or (worse) a double-credit. Run this regularly, not just once.
  app.get("/api/admin/reconciliation", requireAuth, requireAdmin, async (req, res) => {
    await db.read();
    let totalDepositedBalance = 0;
    let totalCreditBalance = 0;
    let totalPaidOut = 0;
    let totalPendingWithdrawals = 0;

    for (const user of Object.values(db.data.users || {})) {
      totalDepositedBalance += user.wallet?.balance || 0;
      totalCreditBalance += user.wallet?.creditBalance || 0;
      for (const w of user.wallet?.withdrawals || []) {
        if (w.status === "paid") totalPaidOut += w.amount;
        if (w.status === "pending") totalPendingWithdrawals += w.amount;
      }
    }

    let onChainBalance = null;
    let onChainError = null;
    try {
      if (process.env.SUPRA_DEPOSIT_ADDRESS) {
        onChainBalance = await getBalance(process.env.SUPRA_DEPOSIT_ADDRESS);
      }
    } catch (err) {
      onChainError = err.message;
    }

    // What should be sitting in the platform wallet: all deposits made,
    // minus whatever has already been paid out for referral withdrawals.
    const expectedOnChain = onChainBalance != null ? +(totalDepositedBalance - totalPaidOut).toFixed(8) : null;
    const drift = expectedOnChain != null ? +(onChainBalance - expectedOnChain).toFixed(8) : null;

    res.json({
      ok: true,
      ledger: {
        totalDepositedBalance: +totalDepositedBalance.toFixed(8),
        totalCreditBalance: +totalCreditBalance.toFixed(8),
        totalPaidOut: +totalPaidOut.toFixed(8),
        totalPendingWithdrawals: +totalPendingWithdrawals.toFixed(8),
      },
      onChain: { balance: onChainBalance, error: onChainError },
      expectedOnChain,
      drift, // should be ~0; nonzero means investigate
    });
  });

  // ── Real, non-custodial deposits ──
  // Step 1: user requests an intent for an amount they want to deposit.
  // We hand back a precise amount (with a unique decimal fingerprint) and
  // our deposit address — the user then sends EXACTLY that amount from
  // their own wallet, paying their own gas.
  app.post("/api/wallet/deposit/intent", requireAuth, async (req, res) => {
    try {
      const amount = Number(req.body.amount);
      const intent = createDepositIntent(req.walletAddress, amount);
      res.json({ ok: true, intent });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // Step 2: frontend sends the tx hash after StarKey confirms the transaction.
  // We fetch the transaction from the chain, verify it, and credit the user.
  // This avoids the server needing to poll the RPC — the browser already has the hash.
  app.post("/api/wallet/deposit/confirm", requireAuth, async (req, res) => {
    const { intentId, txHash } = req.body;
    if (!intentId || !txHash) return res.status(400).json({ ok: false, error: "Missing intentId or txHash" });

    const intent = getIntentStatus(intentId);
    if (!intent) return res.status(404).json({ ok: false, error: "Unknown or expired deposit intent" });
    if (intent.userAddress !== req.walletAddress) return res.status(403).json({ ok: false, error: "Not your deposit intent" });
    if (intent.fulfilled) return res.json({ ok: true, alreadyCredited: true });

    try {
      const result = await confirmDepositByTxHash(db, intent, txHash);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════
  // GENERATE — manual single generation (from "Generate" tab)
  // ════════════════════════════════════════════════════════
  // Free text preview for manual Compose — draft/regenerate as much as you
  // like without being charged. The only charge for the manual flow happens
  // in POST /api/post, right when the user actually publishes.
  app.post("/api/generate/preview", requireAuth, async (req, res) => {
    try {
      await db.read();
      const user = db.forUser(req.walletAddress);
      const styleExamples = pickStyleExamples(user.styleLibrary, 3);
      const text = await generatePost(user.settings, styleExamples);
      const { scores, avg } = await critiquePost(text, user.settings);
      res.json({ ok: true, post: { text, scores, avgScore: avg } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/api/generate", requireAuth, async (req, res) => {
    try {
      const { autoPost, mode, imageStyle, imageCustomPrompt, targetIds } = req.body;
      const result = await runGenerationCycle(db, req.walletAddress, {
        autoPost: !!autoPost,
        mode: mode || "text",
        imageStyle: imageStyle || "auto",
        imageCustomPrompt: imageCustomPrompt || "",
        targetIds: Array.isArray(targetIds) ? targetIds : null,
      });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════
  // CHANNELS — which platforms are connected/enabled for broadcast,
  // plus per-user credentials for channels without OAuth (Telegram bot
  // token, Discord webhook, etc.)
  // ════════════════════════════════════════════════════════
  app.get("/api/channels", requireAuth, async (req, res) => {
    await db.read();
    res.json(maskChannels(db.forUser(req.walletAddress).channels));
  });

  // Toggle a channel on/off and/or update its credentials, e.g.
  // { enabled: true, credentials: { botToken: "...", chatId: "..." } }
  app.post("/api/channels/:id", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const { id } = req.params;
    if (!user.channels[id]) return res.status(404).json({ ok: false, error: "Unknown channel" });

    const { credentials, ...rest } = req.body;
    user.channels[id] = { ...user.channels[id], ...rest };
    if (credentials) {
      user.channels[id].credentials = { ...user.channels[id].credentials, ...credentials };
      const hasCreds = Object.values(user.channels[id].credentials).some(Boolean);
      user.channels[id].connected = hasCreds;
    }
    await db.write();
    res.json(maskChannels(user.channels));
  });

  // Test a channel's saved credentials by sending a real test post
  app.post("/api/channels/:id/test", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const { id } = req.params;
    const mod = require("./channels").registry[id];
    if (!mod || !user.channels[id]) return res.status(404).json({ ok: false, error: "Unknown channel" });

    const creds = user.channels[id].credentials || {};
    if (!mod.isConfigured(creds)) return res.json({ ok: false, reason: "Not configured yet." });

    try {
      const result = await mod.publish({ text: "✅ Test post from SupraPost — your connection works!", imagePath: null, mode: "text" }, creds);
      res.json(result);
    } catch (err) {
      res.json({ ok: false, reason: err.message });
    }
  });

  // Publish a manually composed or AI-drafted post
  // body: { text?, imageFilename?, mode, targetIds? }
  //   mode: "text" | "image" | "both"
  //   targetIds: ["telegram","discord"] — optional per-post channel override
  app.post("/api/post", requireAuth, async (req, res) => {
    const { text, imageFilename, mode = "text", targetIds } = req.body;

    if (mode === "text" && !text)  return res.status(400).json({ ok: false, error: "Text required for text mode" });
    if (mode === "image" && !imageFilename) return res.status(400).json({ ok: false, error: "Image required for image mode" });
    if (mode === "both" && (!text || !imageFilename)) return res.status(400).json({ ok: false, error: "Text and image required for both mode" });

    // Charge BEFORE publishing (atomic, all-or-nothing) — this is the only
    // point in the manual Compose flow where SUPRA actually changes hands.
    // Preview/generate steps (/api/generate, /api/image/generate) are free
    // so the user can retry as much as they like; they only pay once they
    // actually hit Post. Previously this route charged nothing at all,
    // meaning manual image and text+image posts went out for free.
    const postId = uuidv4();
    const key = req.walletAddress.replace(/^0x/, "").toLowerCase();
    const pricing = getPricing(db);
    const modePrice = pricing[mode] ?? pricing.text ?? 1;

    const chargeResult = await db.transaction((data) => {
      const u = data.users[key];
      if (!u) return { ok: false, reason: "user_not_found" };
      u.wallet.creditBalance = u.wallet.creditBalance || 0;
      const funds = +((u.wallet.balance || 0) + u.wallet.creditBalance).toFixed(8);
      if (funds < modePrice) return { ok: false, reason: "insufficient_balance" };

      let rem = modePrice;
      const fromCredit = Math.min(u.wallet.creditBalance, rem);
      u.wallet.creditBalance = +(u.wallet.creditBalance - fromCredit).toFixed(8);
      rem = +(rem - fromCredit).toFixed(8);
      u.wallet.balance = +((u.wallet.balance || 0) - rem).toFixed(8);
      u.stats.supraEarned = +((u.stats.supraEarned || 0) + modePrice).toFixed(2);

      return { ok: true, balance: u.wallet.balance, creditBalance: u.wallet.creditBalance };
    });

    if (!chargeResult.ok) {
      return res.status(402).json({ ok: false, error: chargeResult.reason === "insufficient_balance" ? "Insufficient SUPRA balance for this post." : "Could not charge for this post." });
    }

    await db.read();
    const user = db.forUser(req.walletAddress);
    const imagePath = imageFilename ? require("path").join(require("./imageGen").IMAGES_DIR, imageFilename) : null;
    const payload = { text, imagePath, mode };
    const targets = Array.isArray(targetIds) && targetIds.length ? targetIds : null;

    const results = await publishToChannels(payload, user.channels, targets);
    const anyPosted = Object.values(results).some((r) => r.ok);

    const post = {
      id: postId,
      mode,
      text: text || null,
      imageFilename: imageFilename || null,
      imageUrl: imageFilename ? `/images/${imageFilename}` : null,
      time: new Date().toISOString(),
      auto: false,
      results,
    };

    await db.transaction((data) => {
      const u = data.users[key];
      if (!u) return;
      u.posts = u.posts || [];
      u.posts.unshift(post);
      if (u.posts.length > 30) u.posts = u.posts.slice(0, 30);
      if (anyPosted) u.stats.totalPosts = (u.stats.totalPosts || 0) + 1;
    });

    res.json({ ok: true, post, results, wallet: { balance: chargeResult.balance, creditBalance: chargeResult.creditBalance } });
  });

  // ════════════════════════════════════════════════════════
  // IMAGES — generate via AI or accept user upload
  // ════════════════════════════════════════════════════════
  app.get("/api/image/styles", (req, res) => {
    const { STYLES } = require("./imageGen");
    res.json(Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label })));
  });

  app.post("/api/image/generate", requireAuth, async (req, res) => {
    const { generateImage } = require("./imageGen");
    const { postText, style, customPrompt, width, height } = req.body;
    const result = await generateImage({ postText: postText || "Web3 blockchain", style, customPrompt, width, height });
    if (result.ok) result.imageUrl = `/images/${result.imageFilename}`;
    res.json(result);
  });

  app.post("/api/image/upload", requireAuth, (req, res) => {
    const { saveUploadedImage } = require("./imageGen");
    const { data, mimeType } = req.body;
    if (!data) return res.status(400).json({ ok: false, error: "data required" });
    try {
      const result = saveUploadedImage(data, mimeType);
      result.imageUrl = `/images/${result.imageFilename}`;
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════
  // AUTOMATION — start/stop cron-driven cycle, settings (per user)
  // ════════════════════════════════════════════════════════
  app.get("/api/automation", requireAuth, async (req, res) => {
    await db.read();
    res.json(db.forUser(req.walletAddress).automation);
  });

  app.post("/api/automation/settings", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const { cycleSeconds, autoApprove, mode, imageStyle, imageCustomPrompt, withImage } = req.body;
    if (cycleSeconds)                     user.automation.cycleSeconds      = Number(cycleSeconds);
    if (typeof autoApprove === "boolean") user.automation.autoApprove       = autoApprove;
    if (mode)                             user.automation.mode              = mode;
    if (imageStyle)                       user.automation.imageStyle        = imageStyle;
    if (imageCustomPrompt !== undefined)  user.automation.imageCustomPrompt = imageCustomPrompt;
    if (typeof withImage === "boolean") {
      user.automation.mode = withImage
        ? (user.automation.mode !== "image" ? "both" : "image")
        : (user.automation.mode === "both"  ? "text" : user.automation.mode);
    }
    await db.write();
    res.json(user.automation);
  });

  app.post("/api/automation/start", requireAuth, async (req, res) => {
    await db.read();
    await startAutomation(db, req.walletAddress);
    await db.write();
    res.json(db.forUser(req.walletAddress).automation);
  });

  app.post("/api/automation/stop", requireAuth, async (req, res) => {
    await stopAutomation(db, req.walletAddress);
    res.json(db.forUser(req.walletAddress).automation);
  });

  // ════════════════════════════════════════════════════════
  // HISTORY & STATS
  // ════════════════════════════════════════════════════════
  app.get("/api/posts", requireAuth, async (req, res) => {
    await db.read();
    res.json(db.forUser(req.walletAddress).posts);
  });

  app.delete("/api/posts", requireAuth, async (req, res) => {
    await db.read();
    db.forUser(req.walletAddress).posts = [];
    await db.write();
    res.json({ ok: true });
  });

  // POST /api/posts/:id/rating — 👍/👎 feedback used to teach future
  // generations which of the user's own posts to imitate (see
  // deepseek.js's pickStyleExamples). Uses a transaction so this can never
  // race with a generation cycle writing a new post at the same time.
  // POST /api/posts/:id/rating — 👍/👎 feedback used to teach future
  // generations which of the user's own posts (and image prompts) to
  // imitate. A 👍 copies the content into the PERMANENT styleLibrary (which
  // survives the rolling 30-post history being trimmed) — that's the only
  // thing pickStyleExamples/pickImagePromptExamples actually read from.
  const MAX_LIBRARY_ENTRIES = 12;

  app.post("/api/posts/:id/rating", requireAuth, async (req, res) => {
    const { rating, target = "both" } = req.body; // rating: "up"|"down"|null · target: "text"|"image"|"both"
    if (![ "up", "down", null ].includes(rating)) {
      return res.status(400).json({ ok: false, error: "rating must be 'up', 'down', or null" });
    }
    if (!["text", "image", "both"].includes(target)) {
      return res.status(400).json({ ok: false, error: "target must be 'text', 'image', or 'both'" });
    }
    const key = req.walletAddress.replace(/^0x/, "").toLowerCase();
    const result = await db.transaction((data) => {
      const u = data.users[key];
      const post = u?.posts?.find(p => p.id === req.params.id);
      if (!post) return { ok: false };

      if (target === "text" || target === "both") post.textRating = rating;
      if (target === "image" || target === "both") post.imageRating = rating;

      u.styleLibrary = u.styleLibrary || { textExamples: [], imagePrompts: [] };
      u.styleLibrary.textExamples = u.styleLibrary.textExamples || [];
      u.styleLibrary.imagePrompts = u.styleLibrary.imagePrompts || [];

      if (target === "text" || target === "both") {
        // Always remove any prior library entry sourced from this post's
        // text first (covers 👍 → 👎 changes, or re-rating).
        u.styleLibrary.textExamples = u.styleLibrary.textExamples.filter(e => e.sourcePostId !== post.id);
        if (rating === "up" && post.text) {
          u.styleLibrary.textExamples.push({ text: post.text, avgScore: post.avgScore || 0, sourcePostId: post.id, addedAt: Date.now() });
          u.styleLibrary.textExamples.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
          u.styleLibrary.textExamples = u.styleLibrary.textExamples.slice(0, MAX_LIBRARY_ENTRIES);
        }
      }

      if (target === "image" || target === "both") {
        u.styleLibrary.imagePrompts = u.styleLibrary.imagePrompts.filter(e => e.sourcePostId !== post.id);
        if (rating === "up" && post.imagePrompt) {
          u.styleLibrary.imagePrompts.push({ prompt: post.imagePrompt, avgScore: post.avgScore || 0, sourcePostId: post.id, addedAt: Date.now() });
          u.styleLibrary.imagePrompts.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
          u.styleLibrary.imagePrompts = u.styleLibrary.imagePrompts.slice(0, MAX_LIBRARY_ENTRIES);
        }
      }
      return { ok: true };
    });
    if (!result.ok) return res.status(404).json({ ok: false, error: "Post not found" });
    res.json({ ok: true });
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    await db.read();
    res.json(db.forUser(req.walletAddress).stats);
  });

  // ════════════════════════════════════════════════════════
  // HEALTH CHECK (public, no auth needed)
  // ════════════════════════════════════════════════════════
  app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // ════════════════════════════════════════════════════════
  // SERVE FRONTEND (built React app) — same origin, no CORS needed
  // ════════════════════════════════════════════════════════
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
    console.log(`[server] Serving built frontend from ${FRONTEND_DIST}`);
  } else {
    app.get("/", (req, res) => res.send("<h2>SupraPost backend running.</h2><p>Build the frontend first.</p>"));
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 SupraPost running at http://localhost:${PORT}`);
    console.log(`   Active users: ${Object.keys(db.data.users).length}\n`);
  });
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
