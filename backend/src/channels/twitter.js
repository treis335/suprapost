const fs = require("fs");

function isConfigured(creds = {}) {
  return !!(creds.apiKey && creds.apiSecret && creds.accessToken && creds.accessSecret);
}

function mkClient(creds) {
  const { TwitterApi } = require("twitter-api-v2");
  return new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

async function publish({ text, imagePath, mode }, creds) {
  if (!isConfigured(creds)) return { ok: false, simulated: true, reason: "not_configured" };

  try {
    const client = mkClient(creds);
    let mediaIds = undefined;

    // Upload image if needed
    const hasImage = (mode === "image" || mode === "both") && imagePath && fs.existsSync(imagePath);
    if (hasImage) {
      try {
        const mediaId = await client.v1.uploadMedia(imagePath);
        mediaIds = [mediaId];
      } catch (e) {
        console.warn("[twitter] media upload failed:", e.message);
      }
    }

    // Build tweet payload
    const payload = {};
    if (mode === "text" || mode === "both") {
      const body = (text || "").length > 280 ? text.slice(0, 277) + "..." : text;
      payload.text = body;
    }
    if (mediaIds) payload.media = { media_ids: mediaIds };

    // Twitter v2 requires at least text or media
    if (!payload.text && !payload.media) return { ok: false, error: "Nothing to post" };

    const res = await client.v2.tweet(payload);
    return { ok: true, data: { id: res.data.id }, url: `https://x.com/i/web/status/${res.data.id}` };
  } catch (err) {
    return { ok: false, error: err.data?.detail || err.message };
  }
}

module.exports = { id: "twitter", isConfigured, publish };
