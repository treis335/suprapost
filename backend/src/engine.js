const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { publishToChannels } = require("./channels");

/**
 * Runs one full generation cycle for a specific user (identified by their
 * wallet address):
 *  1. Check SUPRA balance
 *  2. Deduct cost
 *  3. Generate text via DeepSeek
 *  4. Self-critique score
 *  5. Optionally broadcast to every enabled, configured channel
 *
 * Returns the created post object (whether published or just drafted).
 */
async function runGenerationCycle(db, address, { autoPost }) {
  const log = [];
  const push = (msg) => {
    log.push({ time: new Date().toISOString(), msg });
    console.log(`[engine:${address}] ${msg}`);
  };

  await db.read();
  const user = db.forUser(address);
  const { wallet, settings, channels } = user;

  if (wallet.balance < wallet.costPerPost) {
    push("✕ Insufficient SUPRA balance — cycle aborted");
    return { ok: false, reason: "insufficient_balance", log };
  }

  // 1. charge
  wallet.balance = +(wallet.balance - wallet.costPerPost).toFixed(2);
  user.stats.supraEarned = +(user.stats.supraEarned + wallet.costPerPost).toFixed(2);
  push(`⬡ Charged ${wallet.costPerPost} SUPRA — balance now ${wallet.balance}`);

  // 2. generate text
  push("🤖 Generating post text via DeepSeek...");
  const text = await generatePost(settings);
  push("✓ Text generated");

  // 3. optionally generate image
  let imagePath = null;
  let imageFilename = null;
  let imagePrompt = null;

  if (withImage) {
    push(`🖼 Generating image (style: ${imageStyle})...`);
    const imgResult = await generateImage({ postText: text, style: imageStyle, customPrompt: imageCustomPrompt });
    if (imgResult.ok) {
      imagePath = imgResult.imagePath;
      imageFilename = imgResult.imageFilename;
      imagePrompt = imgResult.prompt;
      push(`✓ Image generated → ${imageFilename}`);
    } else if (imgResult.simulated) {
      push(`⚠ Image skipped — TOGETHER_API_KEY not set`);
    } else {
      push(`⚠ Image failed: ${imgResult.error}`);
    }
  }

  // 4. self-critique
  const { scores, avg } = scorePost();
  push(`🧠 Self-critique score: ${avg}/10`);

  user.stats.totalGenerations += 1;

  const post = {
    id: uuidv4(),
    text,
    scores,
    avgScore: avg,
    time: new Date().toISOString(),
    auto: autoPost,
    results: {}, // per-channel publish results, filled in below if autoPost
  };

  // 4. broadcast to every channel the user has enabled
  if (autoPost) {
    const enabledChannels = Object.entries(channels || {}).filter(([, c]) => c.enabled);
    if (enabledChannels.length === 0) {
      push("⚠ No channels enabled — draft saved but not published anywhere");
    } else {
      push(`🚀 Publishing to ${enabledChannels.length} channel(s): ${enabledChannels.map(([id]) => id).join(", ")}...`);
      const results = await publishToChannels(formatPost(text), channels);
      post.results = results;

      for (const [id, result] of Object.entries(results)) {
        const label = channels[id]?.label || id;
        if (result.ok) push(`✓ ${label}: sent`);
        else if (result.simulated) push(`⚠ ${label}: not configured — skipped`);
        else push(`✕ ${label}: failed (${result.error || "unknown error"})`);
      }
    }
    const anyPosted = Object.values(post.results).some((r) => r.ok);
    if (anyPosted) user.stats.totalPosts += 1;
  }

  user.posts.unshift(post);
  await db.write();

  return { ok: true, post, log };
}

function formatPost(text) {
  return `📢 New SupraPost\n\n${text}`;
}

module.exports = { runGenerationCycle };
