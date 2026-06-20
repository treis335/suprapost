const { v4: uuidv4 } = require("uuid");
const { generatePost, scorePost } = require("./deepseek");
const { postToTelegram } = require("./telegram");

/**
 * Runs one full generation cycle:
 *  1. Check SUPRA balance
 *  2. Deduct cost
 *  3. Generate text via DeepSeek
 *  4. Self-critique score
 *  5. Optionally auto-post to Telegram
 *
 * Returns the created post object (whether posted or just drafted).
 */
async function runGenerationCycle(db, { autoPost }) {
  const log = [];
  const push = (msg) => {
    log.push({ time: new Date().toISOString(), msg });
    console.log(`[engine] ${msg}`);
  };

  await db.read();
  const { wallet, settings } = db.data;

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
    posted: false,
  };

  // 4. post if requested
  if (autoPost) {
    push("🚀 Posting to Telegram...");
    const result = await postToTelegram(formatForTelegram(text));
    post.posted = result.ok;
    post.telegramResult = result.ok ? "sent" : result.simulated ? "simulated (no bot configured)" : "failed";
    push(post.posted ? "✓ Posted successfully" : `⚠ Post not sent (${post.telegramResult})`);
    db.data.stats.totalPosts += 1;
  }

  db.data.posts.unshift(post);
  await db.write();

  return { ok: true, post, log };
}

function formatForTelegram(text) {
  return `📢 <b>New SupraPost</b>\n\n${escapeHtml(text)}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = { runGenerationCycle };
