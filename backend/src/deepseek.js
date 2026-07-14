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
async function generatePost(settings, styleExamples = []) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  const learnedExamples = styleExamples.length
    ? `\n\nThese are the user's own past posts that performed best (highest-rated) — match this energy, structure and hooks, but never repeat them verbatim:\n${styleExamples.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : "";

  const systemPrompt = `You are a crypto/Web3 social media expert. Generate viral, high-quality posts.
Niche: ${settings.niche || "Supra blockchain, DeFi"}
Tone: ${settings.tone || "technical"}
Target audience: ${settings.audience || "Web3 developers and DeFi traders"}
Post type: ${settings.postType || "alpha"}
Avoid: ${settings.avoid || "FUD, price predictions"}
${settings.examples ? "Style examples:\n" + settings.examples : ""}${learnedExamples}

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
        timeout: 30000,
        // Prevent axios from trying to parse truncated JSON responses
        validateStatus: (status) => status < 500,
      }
    );

    // Defensive parsing — DeepSeek can return empty or malformed responses
    const data = typeof res.data === "string" ? (() => {
      try { return JSON.parse(res.data); } catch { return null; }
    })() : res.data;

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn("[deepseek] Empty response from API, using fallback. Status:", res.status);
      return pickFallback();
    }
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
 * Real self-critique — asks DeepSeek to score the post it (or a fallback)
 * just produced, on four dimensions, with brief reasoning. This is the
 * signal used both to show the user a genuine quality score and to decide
 * which of their past posts are worth feeding back in as style examples.
 * Falls back to a neutral flat score if the API/parsing fails, rather than
 * ever inventing a fake high score.
 */
async function critiquePost(text, settings) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const neutral = () => {
    const scores = [
      { label: "Relevance", score: 7 },
      { label: "Engagement", score: 7 },
      { label: "Clarity", score: 7 },
      { label: "Originality", score: 7 },
    ];
    return { scores, avg: 7 };
  };
  if (!apiKey || !text) return neutral();

  const prompt = `Rate this social media post as an expert crypto/Web3 social media critic. Be honest and critical — most posts are mediocre, reserve 9-10 for genuinely excellent ones.

Post:
"""${text}"""

Niche: ${settings.niche || "Supra blockchain, DeFi"} | Target audience: ${settings.audience || "Web3 developers and DeFi traders"}

Score each 0-10 (can use decimals): relevance (fits the niche/audience), engagement (hook strength, shareability), clarity (easy to read, no fluff), originality (not generic/cliché).

Return ONLY this JSON, nothing else: {"relevance": X, "engagement": X, "clarity": X, "originality": X}`;

  try {
    const res = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        timeout: 20000,
        validateStatus: (status) => status < 500,
      }
    );
    const raw = res.data?.choices?.[0]?.message?.content?.trim() || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return neutral();
    const parsed = JSON.parse(match[0]);
    const clamp = (n) => Math.max(0, Math.min(10, Number(n)));
    const scores = [
      { label: "Relevance",   score: clamp(parsed.relevance) },
      { label: "Engagement",  score: clamp(parsed.engagement) },
      { label: "Clarity",     score: clamp(parsed.clarity) },
      { label: "Originality", score: clamp(parsed.originality) },
    ];
    if (scores.some(s => !isFinite(s.score))) return neutral();
    const avg = scores.reduce((a, b) => a + b.score, 0) / scores.length;
    return { scores, avg: +avg.toFixed(1) };
  } catch (err) {
    console.warn("[deepseek] Self-critique failed, using neutral score:", err.message);
    return neutral();
  }
}

/**
 * Picks the best-performing text examples to feed back in as style
 * guidance. Reads from the user's permanent styleLibrary — NOT the rolling
 * `posts` history, which gets trimmed to the last 30 and would otherwise
 * lose good examples over time.
 */
function pickStyleExamples(styleLibrary, limit = 3) {
  const entries = styleLibrary?.textExamples || [];
  return entries
    .slice()
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
    .slice(0, limit)
    .map(e => e.text);
}

module.exports = { generatePost, critiquePost, pickStyleExamples };
