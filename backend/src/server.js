require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { initDB } = require("./db");
const { runGenerationCycle } = require("./engine");
const { startAutomation, stopAutomation } = require("./scheduler");
const channels = require("./channels");
const { generateImage, saveUploadedImage, cleanOldImages, STYLES, IMAGES_DIR } = require("./imageGen");

const PORT = process.env.PORT || 3001;
const FRONTEND_DIST = path.join(__dirname, "..", "..", "frontend", "dist");

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

  // Clean up images older than 7 days on startup
  cleanOldImages(7);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "20mb" })); // generous limit for base64 image uploads

  // Serve generated/uploaded images so Discord embeds and previews work
  app.use("/images", express.static(IMAGES_DIR));

  if (db.data.automation.running) {
    console.log("[server] Resuming automation...");
    startAutomation(db);
  }

  // ── Settings ──────────────────────────────────────────────────────────────
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

  // ── Channels ──────────────────────────────────────────────────────────────
  app.get("/api/channels", async (req, res) => {
    await db.read();
    const list = channels.list().map((ch) => serializeChannel(ch, db.data.channels[ch.id] || {}));
    res.json(list);
  });
  app.post("/api/channels/:id", async (req, res) => {
    await db.read();
    const channel = channels.get(req.params.id);
    if (!channel) return res.status(404).json({ ok: false, error: "Unknown channel" });
    const cfg = db.data.channels[req.params.id] || {};
    for (const f of channel.meta.fields) {
      const v = req.body[f.key];
      if (typeof v === "string" && v.length && !v.includes("•")) cfg[f.key] = v;
    }
    if (typeof req.body.enabled === "boolean") cfg.enabled = req.body.enabled;
    db.data.channels[req.params.id] = cfg;
    await db.write();
    res.json(serializeChannel(channel, cfg));
  });
  app.post("/api/channels/:id/test", async (req, res) => {
    await db.read();
    const channel = channels.get(req.params.id);
    if (!channel) return res.status(404).json({ ok: false, error: "Unknown channel" });
    const cfg = db.data.channels[req.params.id] || {};
    if (!channel.isConfigured(cfg)) return res.json({ ok: false, simulated: true, reason: "not_configured" });
    res.json(await channel.test(cfg));
  });

  // ── Image generation ──────────────────────────────────────────────────────
  // List available styles
  app.get("/api/image/styles", (req, res) => {
    res.json(Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label })));
  });

  // Generate an image from post text (AI)
  app.post("/api/image/generate", async (req, res) => {
    const { postText, style, customPrompt, width, height } = req.body;
    if (!postText) return res.status(400).json({ ok: false, error: "postText required" });
    const result = await generateImage({ postText, style, customPrompt, width, height });
    if (result.ok) result.imageUrl = `/images/${result.imageFilename}`;
    res.json(result);
  });

  // Accept a user-uploaded image (base64)
  app.post("/api/image/upload", (req, res) => {
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

  // ── Wallet ────────────────────────────────────────────────────────────────
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

  // ── Generate ──────────────────────────────────────────────────────────────
  app.post("/api/generate", async (req, res) => {
    try {
      const { autoPost, withImage, imageStyle, imageCustomPrompt } = req.body;
      const result = await runGenerationCycle(db, {
        autoPost: !!autoPost,
        withImage: !!withImage,
        imageStyle: imageStyle || "auto",
        imageCustomPrompt: imageCustomPrompt || "",
      });
      if (result.ok && result.post?.imageFilename) {
        result.post.imageUrl = `/images/${result.post.imageFilename}`;
      }
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Manual post (with optional pre-generated image)
  app.post("/api/post", async (req, res) => {
    await db.read();
    const { text, imageFilename, channels: only } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const imagePath = imageFilename ? path.join(IMAGES_DIR, imageFilename) : null;

    const targetConfig = { ...db.data.channels };
    if (Array.isArray(only) && only.length) {
      for (const id of Object.keys(targetConfig)) {
        targetConfig[id] = { ...targetConfig[id], enabled: only.includes(id) && targetConfig[id].enabled };
      }
    }

    const channelResults = await channels.publishToChannels(text, targetConfig, imagePath);
    const posted = Object.values(channelResults).some((r) => r.ok);

    const post = {
      id: require("uuid").v4(),
      text,
      time: new Date().toISOString(),
      auto: false,
      posted,
      imageFilename: imageFilename || null,
      imageUrl: imageFilename ? `/images/${imageFilename}` : null,
      channelResults,
    };
    db.data.posts.unshift(post);
    if (posted) db.data.stats.totalPosts += 1;
    await db.write();

    res.json({ ok: true, post });
  });

  // ── Automation ────────────────────────────────────────────────────────────
  app.get("/api/automation", async (req, res) => {
    await db.read();
    res.json(db.data.automation);
  });
  app.post("/api/automation/settings", async (req, res) => {
    await db.read();
    const { cycleSeconds, autoApprove, withImage, imageStyle } = req.body;
    if (cycleSeconds) db.data.automation.cycleSeconds = Number(cycleSeconds);
    if (typeof autoApprove === "boolean") db.data.automation.autoApprove = autoApprove;
    if (typeof withImage === "boolean") db.data.automation.withImage = withImage;
    if (imageStyle) db.data.automation.imageStyle = imageStyle;
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

  // ── History + Stats ───────────────────────────────────────────────────────
  app.get("/api/posts", async (req, res) => {
    await db.read();
    // Attach imageUrl if file still exists
    const posts = db.data.posts.map((p) => ({
      ...p,
      imageUrl: p.imageFilename ? `/images/${p.imageFilename}` : null,
    }));
    res.json(posts);
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

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // ── Frontend SPA ──────────────────────────────────────────────────────────
  if (fs.existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    app.get(/^(?!\/api|\/images).*/, (req, res) => res.sendFile(path.join(FRONTEND_DIST, "index.html")));
    console.log(`[server] Serving built frontend from ${FRONTEND_DIST}`);
  } else {
    app.get("/", (req, res) => res.send("<h2>SupraPost backend running.</h2><p>Build the frontend first.</p>"));
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 SupraPost running at http://localhost:${PORT}`);
    console.log(`   Automation: ${db.data.automation.running ? "RUNNING" : "stopped"}\n`);
  });
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
