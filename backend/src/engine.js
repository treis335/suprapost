const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { generateImage } = require("./imageGen");
const { publishToChannels, ORDER: CHANNEL_ORDER } = require("./channels");

/**
 * Runs one full generation cycle:
 *  1. Check SUPRA balance
 *  2. Deduct cost
 *  3. Generate text via DeepSeek
 *  4. Optionally generate an image via Together AI (FLUX)
 *  5. Self-critique score
 *  6. Optionally auto-post to every enabled channel
 */
async function runGenerationCycle(db, { autoPost, withImage = false, imageStyle = "auto", imageCustomPrompt = "" }) {
  const log = [];
  const push = (msg) => {
    log.push({ time: new Date().toISOString(), msg });
    console.log(`[engine] ${msg}`);
  };

  await db.read();
  const { wallet, settings, channels } = db.data;

  if (wallet.balance < wallet.costPerPost) {
    push("✕ Insufficient SUPRA balance — cycle aborted");
    return { ok: false, reason: "insufficient_balance", log };
  }

  // 1. charge
  wallet.balance = +(wallet.balance - wallet.costPerPost).toFixed(2);
  db.data.stats.supraEarned = +(db.data.stats.supraEarned + wallet.costPerPost).toFixed(2);
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
  db.data.stats.totalGenerations += 1;

  const post = {
    id: uuidv4(),
    text,
    scores,
    avgScore: avg,
    time: new Date().toISOString(),
    auto: autoPost,
    posted: false,
    imageFilename: imageFilename || null,
    imagePrompt: imagePrompt || null,
    channelResults: {},
  };

  // 5. post to channels
  if (autoPost) {
    const enabledIds = CHANNEL_ORDER.filter((id) => channels[id]?.enabled);
    if (enabledIds.length === 0) {
      push("⚠ No channels enabled — draft saved without publishing");
    } else {
      push(`🚀 Publishing to ${enabledIds.length} channel(s): ${enabledIds.join(", ")}...`);
      const results = await publishToChannels(text, channels, imagePath);
      post.channelResults = results;

      for (const channelId of Object.keys(results)) {
        const r = results[channelId];
        if (r.ok) push(`✓ ${channelId} — posted`);
        else if (r.simulated) push(`⚠ ${channelId} — skipped (${r.reason || "not configured"})`);
        else push(`✕ ${channelId} — failed: ${r.error || "unknown"}`);
      }

      post.posted = Object.values(results).some((r) => r.ok);
      if (post.posted) db.data.stats.totalPosts += 1;
    }
  }

  db.data.posts.unshift(post);
  await db.write();

  return { ok: true, post, log };
}

module.exports = { runGenerationCycle };
