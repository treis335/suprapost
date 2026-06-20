const axios = require("axios");

const FALLBACK_TWEETS = [
  "Most people still don't understand why Supra is changing DeFi.\n\nSpeed. Finality. Composability.\n\nThis is what the next bull run is built on.\n\n#Supra #DeFi #Web3",
  "The alpha nobody's talking about:\n\nSupra is quietly building infrastructure every chain will copy in 2 years.\n\nEarly movers always win.\n\n#Supra #Crypto",
  "Stop trading noise. Start building signal.\n\nSupra fundamentals have never been stronger.\n\nOn-chain data doesn't lie.\n\n#DeFi #Supra #WAGMI",
];

/**
 * Generates a post using DeepSeek's chat completion API based on the
 * user's content profile (settings) stored in the DB.
 */
async function generatePost(settings) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  const systemPrompt = `You are a crypto/Web3 social media expert. Generate viral, high-quality posts.
Niche: ${settings.niche || "Supra blockchain, DeFi"}
Tone: ${settings.tone || "technical"}
Target audience: ${settings.audience || "Web3 developers and DeFi traders"}
Post type: ${settings.postType || "alpha"}
Avoid: ${settings.avoid || "FUD, price predictions"}
${settings.examples ? "Style examples:\n" + settings.examples : ""}

Rules:
- Max 280 characters
- Max 2 emojis
- Strong hook in the first line
- Add real value, no fluff
- Return ONLY the post text, nothing else`;

  const userMessage =
    settings.customPrompt ||
    `Generate a ${settings.postType || "alpha"} post about ${settings.niche || "Supra blockchain"}`;

  if (!apiKey) {
    console.warn("[deepseek] No API key set — using fallback content");
    return pickFallback();
  }

  try {
    const res = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.85,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 20000,
      }
    );

    const text = res.data.choices[0].message.content.trim();
    return text;
  } catch (err) {
    console.error("[deepseek] API error:", err.response?.data || err.message);
    return pickFallback();
  }
}

function pickFallback() {
  return FALLBACK_TWEETS[Math.floor(Math.random() * FALLBACK_TWEETS.length)];
}

/**
 * Simple self-critique scoring — simulated for now.
 * Could later call DeepSeek again with a "rate this post" prompt.
 */
function scorePost() {
  const rand = (a, b) => Math.min(10, a + Math.random() * (b - a));
  const scores = [
    { label: "Relevance", score: rand(7, 10) },
    { label: "Engagement", score: rand(7, 10) },
    { label: "Clarity", score: rand(7.5, 10) },
    { label: "Originality", score: rand(6.5, 10) },
  ];
  const avg = scores.reduce((a, b) => a + b.score, 0) / scores.length;
  return { scores, avg: +avg.toFixed(1) };
}

module.exports = { generatePost, scorePost };
