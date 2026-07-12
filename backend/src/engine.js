const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { generateImage } = require("./imageGen");
const { publishToChannels } = require("./channels");
const { getPricing } = require("./db");
const path = require("path");
const { IMAGES_DIR } = require("./imageGen");

// ── Per-user lock ────────────────────────────────────────────────────────────
// If two cycles for the same user overlap (e.g. a stray duplicate automation
// timer, or automation firing while a manual "Generate" is in flight), each
// one reads the wallet balance independently and the slower write silently
// clobbers the faster one — the user gets charged once instead of twice even
// though two posts went out. This serialises all cycles per address so a
// charge is always applied to the *result* of the previous one, never to a
// stale snapshot.
const userLocks = new Map(); // address (lowercase) -> promise chain tail

async function runGenerationCycle(db, address, opts = {}) {
  const key = (address || "").toLowerCase();
  const prevTail = userLocks.get(key) || Promise.resolve();
  const runPromise = prevTail
    .catch(() => {}) // don't let a previous failure block the queue
    .then(() => runGenerationCycleLocked(db, address, opts));
  userLocks.set(key, runPromise);
  try {
    return await runPromise;
  } finally {
    if (userLocks.get(key) === runPromise) userLocks.delete(key);
  }
}

async function runGenerationCycleLocked(db, address, opts = {}) {
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
  const pricing = getPricing(db);
  const modePrice = pricing[mode] ?? pricing.text ?? wallet.costPerPost ?? 1;
  const totalFunds = +(wallet.balance + wallet.creditBalance).toFixed(8);
  if (totalFunds < modePrice) {
    push("✕ Insufficient SUPRA balance — cycle aborted");
    return { ok: false, reason: "insufficient_balance", log };
  }

  function charge(amount) {
    let rem = amount;
    const fromCredit = Math.min(wallet.creditBalance, rem);
    wallet.creditBalance = +(wallet.creditBalance - fromCredit).toFixed(8);
    rem = +(rem - fromCredit).toFixed(8);
    wallet.balance = +(wallet.balance - rem).toFixed(8);
    user.stats.supraEarned = +(user.stats.supraEarned + amount).toFixed(2);
  }

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
  let imageFailed   = false;

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
      imageFailed = true;
      push("⚠ Image skipped — TOGETHER_API_KEY not set");
    } else {
      imageFailed = true;
      push(`⚠ Image generation failed: ${result.error}`);
    }
  }

  // All-or-nothing policy: if image was required but failed, abort without charging.
  // The user paid for a specific mode — if we can't deliver it, they get nothing charged.
  if (imageFailed && (mode === "image" || mode === "both")) {
    push(`✕ Image generation failed — cycle aborted, nothing charged`);
    return { ok: false, reason: "generation_failed", detail: "Image generation failed", log };
  }

  charge(modePrice);
  push(`⬡ Charged ${modePrice} SUPRA (${mode}) — balance now ${wallet.balance} (+${wallet.creditBalance} credits)`);

  const { scores, avg } = scorePost();
  push(`🧠 Self-critique: ${avg}/10`);
  user.stats.totalGenerations += 1;

  const post = {
    id:       uuidv4(),
    mode:     mode,
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
