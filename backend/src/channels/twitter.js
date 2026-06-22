/**
 * Twitter / X channel — API v2 (user-context, OAuth 1.0a keys).
 * Real, fully working publisher once the user supplies a key pair
 * with write access from the X Developer Portal.
 */
const id = "twitter";

const meta = {
  id,
  name: "Twitter / X",
  icon: "𝕏",
  color: "#1d9bf0",
  description: "Post a tweet (auto-trimmed to 280 characters).",
  fields: [
    { key: "apiKey", label: "API Key", type: "password" },
    { key: "apiSecret", label: "API Secret", type: "password" },
    { key: "accessToken", label: "Access Token", type: "password" },
    { key: "accessSecret", label: "Access Token Secret", type: "password" },
  ],
  helpUrl: "https://developer.twitter.com/en/portal/dashboard",
};

function isConfigured(cfg = {}) {
  return !!(cfg.apiKey && cfg.apiSecret && cfg.accessToken && cfg.accessSecret);
}

function client(cfg) {
  const { TwitterApi } = require("twitter-api-v2");
  return new TwitterApi({
    appKey: cfg.apiKey,
    appSecret: cfg.apiSecret,
    accessToken: cfg.accessToken,
    accessSecret: cfg.accessSecret,
  });
}

async function tweet(text, cfg) {
  try {
    const body = text.length > 280 ? text.slice(0, 277) + "..." : text;
    const res = await client(cfg).v2.tweet(body);
    return { ok: true, data: { id: res.data.id }, url: `https://x.com/i/web/status/${res.data.id}` };
  } catch (err) {
    return { ok: false, error: err.data?.detail || err.message };
  }
}

async function publish(text, cfg = {}) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };
  return tweet(text, cfg);
}

async function test(cfg = {}) {
  return tweet("✅ SupraPost — this X account is connected.", cfg);
}

module.exports = { id, meta, isConfigured, publish, test };
