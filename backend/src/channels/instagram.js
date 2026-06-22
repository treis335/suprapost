/**
 * Instagram channel — Graph API (Business/Creator accounts only).
 * With image support, this is now wired for real use — the Graph API
 * requires a media URL accessible from Facebook's servers. For local
 * setups (localhost) this remains simulated; in production (public URL)
 * it's a one-config-field change (IMAGE_BASE_URL env var).
 */
const axios = require("axios");

const id = "instagram";

const meta = {
  id,
  name: "Instagram",
  icon: "📷",
  color: "#E1306C",
  description: "Post image + caption via Graph API (Business/Creator account).",
  fields: [
    { key: "accessToken", label: "Access Token", type: "password" },
    { key: "igUserId", label: "IG Business Account ID", type: "text" },
    { key: "imageBaseUrl", label: "Public Image Base URL", type: "text", placeholder: "https://yourdomain.com" },
  ],
  helpUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api",
};

function isConfigured(cfg = {}) {
  return !!(cfg.accessToken && cfg.igUserId);
}

async function publish(text, cfg = {}, imagePath = null) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };

  // Instagram requires a publicly accessible image URL — skip if no base URL or no image
  const baseUrl = (cfg.imageBaseUrl || process.env.IMAGE_BASE_URL || "").replace(/\/$/, "");
  if (!imagePath || !baseUrl) {
    return { ok: false, simulated: true, reason: "instagram_needs_public_image_url" };
  }

  const filename = require("path").basename(imagePath);
  const imageUrl = `${baseUrl}/images/${filename}`;

  try {
    // Step 1: create media container
    const containerRes = await axios.post(
      `https://graph.facebook.com/v19.0/${cfg.igUserId}/media`,
      { image_url: imageUrl, caption: text, access_token: cfg.accessToken },
      { timeout: 20000 }
    );
    const creationId = containerRes.data?.id;
    if (!creationId) throw new Error("No creation ID from Instagram");

    // Step 2: publish the container
    await axios.post(
      `https://graph.facebook.com/v19.0/${cfg.igUserId}/media_publish`,
      { creation_id: creationId, access_token: cfg.accessToken },
      { timeout: 20000 }
    );

    return { ok: true, data: { creationId } };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error?.message || err.message };
  }
}

async function test(cfg = {}) {
  return { ok: false, simulated: true, reason: "manual_test_not_supported_for_instagram" };
}

module.exports = { id, meta, isConfigured, publish, test };
