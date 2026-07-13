const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { generateImage } = require("./imageGen");
const { publishToChannels } = require("./channels");
const { getPricing, freshUserData } = require("./db");
const path = require("path");
const { IMAGES_DIR } = require("./imageGen");

// ── Per-user lock ────────────────────────────────────────────────────────────
// If two cycles for the same user overlap (e.g. a stray duplicate automation
// timer, or automation firing while a manual "Generate" is in flight), each
// one would otherwise read the wallet independently and the slower write
// could clobber the faster one. This serialises all cycles per address.
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

function normaliseAddress(address) {
  const raw = String(address || "").trim();
  return (raw.startsWith("0x") ? raw.slice(2) : raw).toLowerCase();
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

  // Informational read — settings/channels for generation. Not money-critical
  // on its own, so a plain read() here is fine.
  await db.read();
  const user = db.forUser(address);
  const { settings, channels } = user;

  const pricing = getPricing(db);
  const modePrice = pricing[mode] ?? pricing.text ?? 1;

  // Cheap pre-check so we don't waste API calls on a request that's
  // obviously going to fail — this is NOT the authoritative check (that
  // happens atomically below, right before charging).
  const preFunds = +((user.wallet.balance || 0) + (user.wallet.creditBalance || 0)).toFixed(8);
  if (preFunds < modePrice) {
    push("✕ Insufficient SUPRA balance — cycle aborted");
    return { ok: false, reason: "insufficient_balance", log };
  }

  // ── Text (slow, external API — deliberately outside any DB lock) ──────────
  let text = null;
  if (mode === "text" || mode === "both") {
    push("🤖 Generating text via DeepSeek...");
    text = await generatePost(settings);
    push("✓ Text generated");
  }

  // ── Image (slow, external API — deliberately outside any DB lock) ────────
  let imagePath     = null;
  let imageFilename = null;
  let imageFailed   = false;

  if (mode === "image" || mode === "both") {
    push(`🖼 Generating image (style: ${imageStyle})...`);
    const result = await generateImage({
      postText:     text || settings.niche || "Web3 blockchain crypto",
      style:        imageStyle,
      customPrompt: imageCustomPrompt,
      modo_economico: opts.modo_economico ?? true,
    });
    if (result.ok) {
      imagePath     = result.imagePath;
      imageFilename = result.imageFilename;
      push(`✓ Image ready → ${imageFilename}`);
    } else {
      imageFailed = true;
      push(`⚠ Image generation failed: ${result.error || "unknown error"}`);
    }
  }

  // All-or-nothing policy: if image was required but failed, abort without
  // charging. The user paid for a specific mode — if we can't deliver it,
  // nothing is charged and nothing is posted.
  if (imageFailed && (mode === "image" || mode === "both")) {
    push("✕ Image generation failed — cycle aborted, nothing charged");
    return { ok: false, reason: "generation_failed", detail: "Image generation failed", log };
  }

  const { scores, avg } = scorePost();
  push(`🧠 Self-critique: ${avg}/10`);

  const postId = uuidv4();

  // ── Atomic charge + save (the ONLY part that must be a true transaction) ──
  // Held for milliseconds only — re-reads fresh data, re-verifies funds
  // (they could have changed since the pre-check above, e.g. another cycle
  // finished in the meantime), deducts, and records the post, all as one
  // indivisible unit. No other read/write/transaction can interleave with
  // this, so the charge can never be silently lost or duplicated.
  const chargeResult = await db.transaction((data) => {
    const key = normaliseAddress(address);
    data.users = data.users || {};
    if (!data.users[key]) data.users[key] = freshUserData();
    const u = data.users[key];

    u.wallet.creditBalance = u.wallet.creditBalance || 0;
    const funds = +((u.wallet.balance || 0) + u.wallet.creditBalance).toFixed(8);
    if (funds < modePrice) return { ok: false, reason: "insufficient_balance" };

    let rem = modePrice;
    const fromCredit = Math.min(u.wallet.creditBalance, rem);
    u.wallet.creditBalance = +(u.wallet.creditBalance - fromCredit).toFixed(8);
    rem = +(rem - fromCredit).toFixed(8);
    u.wallet.balance = +((u.wallet.balance || 0) - rem).toFixed(8);
    u.stats.supraEarned = +((u.stats.supraEarned || 0) + modePrice).toFixed(2);
    u.stats.totalGenerations = (u.stats.totalGenerations || 0) + 1;

    const post = {
      id:       postId,
      mode,
      text,
      imageUrl: imageFilename ? `/images/${imageFilename}` : null,
      avgScore: avg,
      time:     new Date().toISOString(),
      auto:     autoPost,
      results:  {},
    };
    u.posts = u.posts || [];
    u.posts.unshift(post);
    if (u.posts.length > 30) u.posts = u.posts.slice(0, 30);

    return { ok: true, balance: u.wallet.balance, creditBalance: u.wallet.creditBalance, post };
  });

  if (!chargeResult.ok) {
    push(chargeResult.reason === "insufficient_balance"
      ? "✕ Insufficient SUPRA balance at charge time — cycle aborted"
      : "✕ Could not charge — cycle aborted");
    return { ok: false, reason: chargeResult.reason || "insufficient_balance", log };
  }

  push(`⬡ Charged ${modePrice} SUPRA (${mode}) — balance now ${chargeResult.balance} (+${chargeResult.creditBalance} credits)`);
  let post = chargeResult.post;

  // ── Publish (slow, external APIs — outside the lock) ──────────────────────
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

      for (const [id, r] of Object.entries(results)) {
        if (r.ok)             push(`✓ ${id}: sent`);
        else if (r.simulated) push(`⚠ ${id}: not configured`);
        else                  push(`✕ ${id}: ${r.error || "failed"}`);
      }

      // Short second transaction: attach publish results to the post we
      // already saved and charged for. Re-locates the post by id inside
      // fresh data rather than trusting an old in-memory reference.
      const anyOk = Object.values(results).some(r => r.ok);
      await db.transaction((data) => {
        const key = normaliseAddress(address);
        const u = data.users[key];
        if (!u) return;
        const p = (u.posts || []).find(x => x.id === postId);
        if (p) p.results = results;
        if (anyOk) u.stats.totalPosts = (u.stats.totalPosts || 0) + 1;
      });
      post = { ...post, results };
    }
  }

  return { ok: true, post, log };
}

module.exports = { runGenerationCycle };
