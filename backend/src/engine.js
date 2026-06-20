const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { publishToChannels } = require("./channels");

/**
 * Runs one full generation cycle:
 *  1. Check SUPRA balance
 *  2. Deduct cost
 *  3. Generate text via DeepSeek
 *  4. Self-critique score
 *  5. Optionally broadcast to every enabled, configured channel
 *
 * Returns the created post object (whether published or just drafted).
 */
async function runGenerationCycle(db, { autoPost }) {
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

  // 2. generate
  push("🤖 Generating post via DeepSeek...");
  const text = await generatePost(settings);
  push("✓ Draft generated");

  // 3. self-critique
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
    if (anyPosted) db.data.stats.totalPosts += 1;
  }

  db.data.posts.unshift(post);
  await db.write();

  return { ok: true, post, log };
}

function formatPost(text) {
  return `📢 New SupraPost\n\n${text}`;
}

module.exports = { runGenerationCycle };
