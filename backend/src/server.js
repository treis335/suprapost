require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { initDB } = require("./db");
const { runGenerationCycle } = require("./engine");
const { startAutomation, stopAutomation, resumeAllAutomations } = require("./scheduler");
const { publishToChannels } = require("./channels");
const { createNonce, verifyAndIssueToken, requireAuth } = require("./auth");
const { createDepositIntent, getIntentStatus, pollForDeposits, confirmDepositByTxHash } = require("./deposits");
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
  app.use(cors());
  app.use(express.json({ limit: "20mb" })); // generous limit for base64 image uploads

  // Serve generated/uploaded images so Discord embeds and previews work
  app.use("/images", express.static(IMAGES_DIR));

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
    const { address } = req.body;
    if (!address) return res.status(400).json({ ok: false, error: "Missing wallet address" });
    const message = createNonce(address);
    res.json({ ok: true, message });
  });

  app.post("/api/auth/verify", async (req, res) => {
    const { address, signature, publicKey } = req.body;
    if (!address || !signature) return res.status(400).json({ ok: false, error: "Missing address or signature" });
    const result = await verifyAndIssueToken(address, signature, publicKey);
    if (!result.ok) return res.status(401).json(result);
    res.json(result);
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ ok: true, address: req.walletAddress });
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

  // GET /api/wallet
  // - ALLOW_SIMULATED_TOPUP=true  → return stored (simulated) balance
  // - otherwise                   → fetch real on-chain balance, store it, return it
  app.get("/api/wallet", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);

    if (process.env.ALLOW_SIMULATED_TOPUP !== "true") {
      // Real mode: read balance directly from the Supra blockchain
      try {
        const { getBalance } = require("./supraClient");
        const onChain = await getBalance(req.walletAddress);
        // truncate to 10 decimal places — chain returns up to 8 (octa precision)
        user.wallet.balance = +onChain.toFixed(8);
        await db.write();
      } catch (err) {
        console.error("[wallet] Failed to fetch on-chain balance:", err.message);
        // fall through — return last-known cached balance rather than erroring
      }
    }

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

  // Publish a manually composed or AI-drafted post
  // body: { text?, imageFilename?, mode, targetIds? }
  //   mode: "text" | "image" | "both"
  //   targetIds: ["telegram","discord"] — optional per-post channel override
  app.post("/api/post", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const { text, imageFilename, mode = "text", targetIds } = req.body;

    if (mode === "text" && !text)  return res.status(400).json({ ok: false, error: "Text required for text mode" });
    if (mode === "image" && !imageFilename) return res.status(400).json({ ok: false, error: "Image required for image mode" });
    if (mode === "both" && (!text || !imageFilename)) return res.status(400).json({ ok: false, error: "Text and image required for both mode" });

    const imagePath = imageFilename ? require("path").join(require("./imageGen").IMAGES_DIR, imageFilename) : null;
    const payload = { text, imagePath, mode };
    const targets = Array.isArray(targetIds) && targetIds.length ? targetIds : null;

    const results = await publishToChannels(payload, user.channels, targets);
    const anyPosted = Object.values(results).some((r) => r.ok);

    const post = {
      id: uuidv4(),
      mode,
      text: text || null,
      imageFilename: imageFilename || null,
      imageUrl: imageFilename ? `/images/${imageFilename}` : null,
      time: new Date().toISOString(),
      auto: false,
      results,
    };
    user.posts.unshift(post);
    if (anyPosted) user.stats.totalPosts += 1;
    await db.write();

    res.json({ ok: true, post, results });
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
    startAutomation(db, req.walletAddress);
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
