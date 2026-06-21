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

const PORT = process.env.PORT || 3001;
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

/**
 * Strips credential secrets before sending channel state to the frontend.
 * The UI only needs to know a channel IS configured, not see the token.
 */
function maskChannels(channels) {
  const out = {};
  for (const [id, ch] of Object.entries(channels)) {
    const hasCreds = ch.credentials && Object.values(ch.credentials).some(Boolean);
    out[id] = { label: ch.label, icon: ch.icon, connected: ch.connected || hasCreds, enabled: ch.enabled };
  }
  return out;
}

async function main() {
  const db = await initDB();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ── Resume automation for every user who had it running ──
  resumeAllAutomations(db);

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
    const { address, signature } = req.body;
    if (!address || !signature) return res.status(400).json({ ok: false, error: "Missing address or signature" });
    const result = await verifyAndIssueToken(address, signature);
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
  // WALLET — balance, top-up (simulated SUPRA for now)
  // ════════════════════════════════════════════════════════
  app.get("/api/wallet", requireAuth, async (req, res) => {
    await db.read();
    res.json(db.forUser(req.walletAddress).wallet);
  });

  app.post("/api/wallet/topup", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const amount = Number(req.body.amount) || 10;
    user.wallet.balance = +(user.wallet.balance + amount).toFixed(2);
    await db.write();
    res.json(user.wallet);
  });

  // ════════════════════════════════════════════════════════
  // GENERATE — manual single generation (from "Generate" tab)
  // ════════════════════════════════════════════════════════
  app.post("/api/generate", requireAuth, async (req, res) => {
    try {
      const autoPost = !!req.body.autoPost; // false = just preview, true = post immediately
      const result = await runGenerationCycle(db, req.walletAddress, { autoPost });
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

  // Post an already-generated (or edited) draft to every enabled channel
  app.post("/api/post", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const { text } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const results = await publishToChannels(`📢 New SupraPost\n\n${text}`, user.channels);
    const anyPosted = Object.values(results).some((r) => r.ok);

    const post = {
      id: uuidv4(),
      text,
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
  // AUTOMATION — start/stop cron-driven cycle, settings (per user)
  // ════════════════════════════════════════════════════════
  app.get("/api/automation", requireAuth, async (req, res) => {
    await db.read();
    res.json(db.forUser(req.walletAddress).automation);
  });

  app.post("/api/automation/settings", requireAuth, async (req, res) => {
    await db.read();
    const user = db.forUser(req.walletAddress);
    const { cycleSeconds, autoApprove } = req.body;
    if (cycleSeconds) user.automation.cycleSeconds = Number(cycleSeconds);
    if (typeof autoApprove === "boolean") user.automation.autoApprove = autoApprove;
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
    app.get("/", (req, res) => {
      res.send(
        "<h2>SupraPost backend is running.</h2><p>Frontend not built yet — run <code>npm run build</code> in /frontend, or run the frontend dev server separately on its own port (e.g. http://localhost:5173).</p>"
      );
    });
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 SupraPost running at http://localhost:${PORT}`);
    console.log(`   Active users: ${Object.keys(db.data.users).length}\n`);
  });
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
