/**
 * Instagram channel — Graph API (Business/Creator accounts only).
 * The Graph API requires every post to carry an image or video — pure
 * text posting doesn't exist on Instagram. The config + UI is fully
 * wired up so this becomes a one-function change once SupraPost grows
 * an image-generation step in the pipeline.
 */
const id = "instagram";

const meta = {
  id,
  name: "Instagram",
  icon: "📷",
  color: "#E1306C",
  description: "Requires an image per post — arriving once image generation lands.",
  comingSoon: true,
  fields: [
    { key: "accessToken", label: "Access Token", type: "password" },
    { key: "igUserId", label: "IG Business Account ID", type: "text" },
  ],
  helpUrl: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api",
};

function isConfigured(cfg = {}) {
  return !!(cfg.accessToken && cfg.igUserId);
}

async function publish(_text, _cfg = {}) {
  return { ok: false, simulated: true, reason: "instagram_requires_media" };
}

async function test(_cfg = {}) {
  return { ok: false, simulated: true, reason: "coming_soon" };
}

module.exports = { id, meta, isConfigured, publish, test };
