const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { generateImage } = require("./imageGen");
const { publishToChannels } = require("./channels");
const path = require("path");
const { IMAGES_DIR } = require("./imageGen");

async function runGenerationCycle(db, address, opts = {}) {
  const {
    autoPost     = false,
    mode         = "text",   // "text" | "image" | "both"
    imageStyle   = "auto",
    imageCustomPrompt = "",
    targetIds    = null,     // null = all enabled channels
  } = opts;

  const log = [];
  const push = (msg) => {
    log.push({ time: new Date().toISOString(), msg });
    console.log(`[engine:${address}] ${msg}`);
  };

  await db.read();
  const user = db.forUser(address);
  const { wallet, settings, channels } = user;

  wallet.creditBalance = wallet.creditBalance || 0;
  const totalFunds = +(wallet.balance + wallet.creditBalance).toFixed(8);
  if (totalFunds < wallet.costPerPost) {
    push("✕ Insufficient SUPRA balance — cycle aborted");
    return { ok: false, reason: "insufficient_balance", log };
  }

  // Spend referral credits first, then the deposited balance
  let remaining = wallet.costPerPost;
  const fromCredit = Math.min(wallet.creditBalance, remaining);
  wallet.creditBalance = +(wallet.creditBalance - fromCredit).toFixed(8);
  remaining = +(remaining - fromCredit).toFixed(8);
  wallet.balance = +(wallet.balance - remaining).toFixed(8);
  user.stats.supraEarned = +(user.stats.supraEarned + modePrice).toFixed(2);
  push(`⬡ Charged ${modePrice} SUPRA (${mode}) — balance now ${wallet.balance} (+${wallet.creditBalance} credits)`);

  // ── Text ──────────────────────────────────────────────────────────────────
  let text = null;
  if (mode === "text" || mode === "both") {
    push("🤖 Generating text via DeepSeek...");
    text = await generatePost(settings);
    push("✓ Text generated");
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  let imagePath     = null;
  let imageFilename = null;
  let imagePrompt   = null;

  if (mode === "image" || mode === "both") {
    push(`🖼 Generating image (style: ${imageStyle})...`);
    const result = await generateImage({
      postText:     text || settings.niche || "Web3 blockchain crypto",
      style:        imageStyle,
      customPrompt: imageCustomPrompt,
      modo_economico: opts.modo_economico ?? true,   // default: economy mode ON
    });
    if (result.ok) {
      imagePath     = result.imagePath;
      imageFilename = result.imageFilename;
      imagePrompt   = result.prompt;
      push(`✓ Image ready → ${imageFilename}`);
    } else if (result.simulated) {
      push("⚠ Image skipped — TOGETHER_API_KEY not set");
    } else {
      push(`⚠ Image generation failed: ${result.error}`);
    }
  }

  const { scores, avg } = scorePost();
  push(`🧠 Self-critique: ${avg}/10`);
  user.stats.totalGenerations += 1;

  const post = {
    id:       uuidv4(),
    mode,
    text,
    imageUrl: imageFilename ? `/images/${imageFilename}` : null,
    avgScore: avg,
    time:     new Date().toISOString(),
    auto:     autoPost,
    results:  {},
    // imagePrompt and per-channel scores omitted to keep storage lean
  };

  if (autoPost) {
    const enabledIds = Object.entries(channels || {})
      .filter(([, c]) => c.enabled)
      .map(([id]) => id);

    if (enabledIds.length === 0) {
      push("⚠ No channels enabled — draft saved");
    } else {
      const targets = targetIds || enabledIds;
      push(`🚀 Publishing to: ${targets.join(", ")}...`);
      const results = await publishToChannels({ text, imagePath, mode }, channels, targets);
      post.results = results;

      for (const [id, r] of Object.entries(results)) {
        if (r.ok)        push(`✓ ${id}: sent`);
        else if (r.simulated) push(`⚠ ${id}: not configured`);
        else             push(`✕ ${id}: ${r.error || "failed"}`);
      }

      if (Object.values(results).some((r) => r.ok)) user.stats.totalPosts += 1;
    }
  }

  user.posts.unshift(post);
  if (user.posts.length > 30) user.posts = user.posts.slice(0, 30); // keep last 30 only
  await db.write();
  return { ok: true, post, log };
}

module.exports = { runGenerationCycle };
