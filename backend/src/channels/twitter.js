const fs = require("fs");

const id = "twitter";

const meta = {
  id,
  name: "Twitter / X",
  icon: "𝕏",
  color: "#1d9bf0",
  description: "Post a tweet with optional image (auto-trimmed to 280 chars).",
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

async function publish(text, cfg = {}, imagePath = null) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };

  try {
    const body = text.length > 280 ? text.slice(0, 277) + "..." : text;
    const twClient = client(cfg);

    let mediaIds = undefined;

    if (imagePath && fs.existsSync(imagePath)) {
      try {
        // Twitter v1.1 media upload, then attach to v2 tweet
        const mediaId = await twClient.v1.uploadMedia(imagePath);
        mediaIds = [mediaId];
      } catch (mediaErr) {
        console.warn("[twitter] media upload failed, posting text only:", mediaErr.message);
      }
    }

    const payload = { text: body };
    if (mediaIds) payload.media = { media_ids: mediaIds };

    const res = await twClient.v2.tweet(payload);
    return {
      ok: true,
      data: { id: res.data.id },
      url: `https://x.com/i/web/status/${res.data.id}`,
    };
  } catch (err) {
    return { ok: false, error: err.data?.detail || err.message };
  }
}

async function test(cfg = {}) {
  return publish("✅ SupraPost — this X account is connected.", cfg);
}

module.exports = { id, meta, isConfigured, publish, test };
