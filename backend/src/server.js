require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { initDB } = require("./db");
const { runGenerationCycle } = require("./engine");
const { startAutomation, stopAutomation } = require("./scheduler");
const { publishToChannels } = require("./channels");
const { v4: uuidv4 } = require("uuid");

const PORT = process.env.PORT || 3001;
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

async function main() {
  const db = await initDB();
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ── Resume automation on server restart if it was running ──
  if (db.data.automation.running) {
    console.log("[server] Resuming automation that was left running...");
    startAutomation(db);
  }

  // ════════════════════════════════════════════════════════
  // SETTINGS — content profile (niche, tone, audience, etc.)
  // ════════════════════════════════════════════════════════
  app.get("/api/settings", async (req, res) => {
    await db.read();
    res.json(db.data.settings);
  });

  app.post("/api/settings", async (req, res) => {
    await db.read();
    db.data.settings = { ...db.data.settings, ...req.body };
    await db.write();
    res.json(db.data.settings);
  });

  // ════════════════════════════════════════════════════════
  // WALLET — balance, top-up (simulated SUPRA for now)
  // ════════════════════════════════════════════════════════
  app.get("/api/wallet", async (req, res) => {
    await db.read();
    res.json(db.data.wallet);
  });

  app.post("/api/wallet/topup", async (req, res) => {
    await db.read();
    const amount = Number(req.body.amount) || 10;
    db.data.wallet.balance = +(db.data.wallet.balance + amount).toFixed(2);
    await db.write();
    res.json(db.data.wallet);
  });

  // ════════════════════════════════════════════════════════
  // GENERATE — manual single generation (from "Generate" tab)
  // ════════════════════════════════════════════════════════
  app.post("/api/generate", async (req, res) => {
    try {
      const autoPost = !!req.body.autoPost; // false = just preview, true = post immediately
      const result = await runGenerationCycle(db, { autoPost });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════
  // CHANNELS — which platforms are connected/enabled for broadcast
  // ════════════════════════════════════════════════════════
  app.get("/api/channels", async (req, res) => {
    await db.read();
    res.json(db.data.channels);
  });

  // Toggle a single channel on/off, e.g. { enabled: true }
  app.post("/api/channels/:id", async (req, res) => {
    await db.read();
    const { id } = req.params;
    if (!db.data.channels[id]) return res.status(404).json({ ok: false, error: "Unknown channel" });
    db.data.channels[id] = { ...db.data.channels[id], ...req.body };
    await db.write();
    res.json(db.data.channels);
  });

  // Post an already-generated (or edited) draft to every enabled channel
  app.post("/api/post", async (req, res) => {
    await db.read();
    const { text } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const results = await publishToChannels(`📢 New SupraPost\n\n${text}`, db.data.channels);
    const anyPosted = Object.values(results).some((r) => r.ok);

    const post = {
      id: uuidv4(),
      text,
      time: new Date().toISOString(),
      auto: false,
      results,
    };
    db.data.posts.unshift(post);
    if (anyPosted) db.data.stats.totalPosts += 1;
    await db.write();

    res.json({ ok: true, post, results });
  });

  // ════════════════════════════════════════════════════════
  // AUTOMATION — start/stop cron-driven cycle, settings
  // ════════════════════════════════════════════════════════
  app.get("/api/automation", async (req, res) => {
    await db.read();
    res.json(db.data.automation);
  });

  app.post("/api/automation/settings", async (req, res) => {
    await db.read();
    const { cycleSeconds, autoApprove } = req.body;
    if (cycleSeconds) db.data.automation.cycleSeconds = Number(cycleSeconds);
    if (typeof autoApprove === "boolean") db.data.automation.autoApprove = autoApprove;
    await db.write();
    res.json(db.data.automation);
  });

  app.post("/api/automation/start", async (req, res) => {
    await db.read();
    startAutomation(db);
    await db.write();
    res.json(db.data.automation);
  });

  app.post("/api/automation/stop", async (req, res) => {
    await stopAutomation(db);
    res.json(db.data.automation);
  });

  // ════════════════════════════════════════════════════════
  // HISTORY & STATS
  // ════════════════════════════════════════════════════════
  app.get("/api/posts", async (req, res) => {
    await db.read();
    res.json(db.data.posts);
  });

  app.delete("/api/posts", async (req, res) => {
    await db.read();
    db.data.posts = [];
    await db.write();
    res.json({ ok: true });
  });

  app.get("/api/stats", async (req, res) => {
    await db.read();
    res.json(db.data.stats);
  });

  // ════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════
  app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // ════════════════════════════════════════════════════════
  // SERVE FRONTEND (built React app) — same origin, no CORS needed
  // ════════════════════════════════════════════════════════
  const fs = require("fs");
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    // SPA fallback: any non-/api route returns index.html
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
    console.log(`   Automation: ${db.data.automation.running ? "RUNNING" : "stopped"}\n`);
  });
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
