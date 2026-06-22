require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { initDB } = require("./db");
const { runGenerationCycle } = require("./engine");
const { startAutomation, stopAutomation } = require("./scheduler");
const channels = require("./channels");

const PORT = process.env.PORT || 3001;
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

/** Masks secret fields so tokens never round-trip to the browser in plaintext. */
function maskChannelValues(fields, cfg = {}) {
  const out = {};
  for (const f of fields) {
    const v = cfg[f.key] || "";
    out[f.key] = f.type === "password" && v ? "•".repeat(Math.min(v.length, 12)) : v;
  }
  return out;
}

function serializeChannel(channel, cfg) {
  return {
    id: channel.id,
    name: channel.meta.name,
    icon: channel.meta.icon,
    color: channel.meta.color,
    description: channel.meta.description,
    helpUrl: channel.meta.helpUrl,
    comingSoon: !!channel.meta.comingSoon,
    fields: channel.meta.fields,
    enabled: !!cfg.enabled,
    configured: channel.isConfigured(cfg),
    values: maskChannelValues(channel.meta.fields, cfg),
  };
}

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
  // CHANNELS — per-network config (Telegram, Discord, X, Instagram, ...)
  // Scales to new social networks without touching this file: add a
  // module under backend/src/channels/ and register it in the index.
  // ════════════════════════════════════════════════════════
  app.get("/api/channels", async (req, res) => {
    await db.read();
    const list = channels.list().map((channel) => serializeChannel(channel, db.data.channels[channel.id] || {}));
    res.json(list);
  });

  app.post("/api/channels/:id", async (req, res) => {
    await db.read();
    const channel = channels.get(req.params.id);
    if (!channel) return res.status(404).json({ ok: false, error: "Unknown channel" });

    const cfg = db.data.channels[req.params.id] || {};
    const body = req.body || {};

    for (const f of channel.meta.fields) {
      const incoming = body[f.key];
      // ignore masked placeholders ("••••") coming back unedited from the UI
      if (typeof incoming === "string" && incoming.length && !incoming.includes("•")) {
        cfg[f.key] = incoming;
      }
    }
    if (typeof body.enabled === "boolean") cfg.enabled = body.enabled;

    db.data.channels[req.params.id] = cfg;
    await db.write();
    res.json(serializeChannel(channel, cfg));
  });

  app.post("/api/channels/:id/test", async (req, res) => {
    await db.read();
    const channel = channels.get(req.params.id);
    if (!channel) return res.status(404).json({ ok: false, error: "Unknown channel" });

    const cfg = db.data.channels[req.params.id] || {};
    if (!channel.isConfigured(cfg)) {
      return res.json({ ok: false, simulated: true, reason: "not_configured" });
    }
    const result = await channel.test(cfg);
    res.json(result);
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

  // Post an already-generated (or edited) draft on demand, to every
  // enabled channel (or a specific subset via { channels: ["telegram"] })
  app.post("/api/post", async (req, res) => {
    await db.read();
    const { text, channels: only } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const targetConfig = { ...db.data.channels };
    if (Array.isArray(only) && only.length) {
      for (const id of Object.keys(targetConfig)) {
        targetConfig[id] = { ...targetConfig[id], enabled: only.includes(id) && targetConfig[id].enabled };
      }
    }

    const channelResults = await channels.publishToChannels(text, targetConfig);
    const posted = Object.values(channelResults).some((r) => r.ok);

    const post = {
      id: require("uuid").v4(),
      text,
      time: new Date().toISOString(),
      auto: false,
      posted,
      channelResults,
    };
    db.data.posts.unshift(post);
    if (posted) db.data.stats.totalPosts += 1;
    await db.write();

    res.json({ ok: true, post });
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
