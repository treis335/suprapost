const axios = require("axios");
const path = require("path");

function isConfigured(creds = {}) {
  return !!(creds.accessToken && creds.igUserId);
}

async function publish({ text, imagePath, mode }, creds) {
  if (!isConfigured(creds)) return { ok: false, simulated: true, reason: "not_configured" };

  const baseUrl = (creds.imageBaseUrl || process.env.IMAGE_BASE_URL || "").replace(/\/$/, "");
  if (!imagePath || !baseUrl) {
    return { ok: false, simulated: true, reason: "instagram_needs_image_and_public_url" };
  }

  const imageUrl = `${baseUrl}/images/${path.basename(imagePath)}`;
  const caption = (mode === "both" && text) ? text : undefined;

  try {
    const container = await axios.post(
      `https://graph.facebook.com/v19.0/${creds.igUserId}/media`,
      { image_url: imageUrl, ...(caption ? { caption } : {}), access_token: creds.accessToken },
      { timeout: 20000 }
    );
    const creationId = container.data?.id;
    if (!creationId) throw new Error("No creation ID from Instagram");

    await axios.post(
      `https://graph.facebook.com/v19.0/${creds.igUserId}/media_publish`,
      { creation_id: creationId, access_token: creds.accessToken },
      { timeout: 20000 }
    );
    return { ok: true, data: { creationId } };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error?.message || err.message };
  }
}

module.exports = { id: "instagram", isConfigured, publish };
