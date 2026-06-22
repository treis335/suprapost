const axios = require("axios");

/**
 * Discord channel — incoming webhook.
 * Real, fully working publisher. No app review needed; the user just
 * pastes a webhook URL from a channel's Integrations settings.
 */
const id = "discord";

const meta = {
  id,
  name: "Discord",
  icon: "🎮",
  color: "#5865F2",
  description: "Post to any channel via an incoming webhook.",
  fields: [
    { key: "webhookUrl", label: "Webhook URL", type: "password", placeholder: "https://discord.com/api/webhooks/..." },
  ],
  helpUrl: "https://support.discord.com/hc/en-us/articles/228383668",
};

function isConfigured(cfg = {}) {
  return !!cfg.webhookUrl;
}

async function send(content, cfg) {
  try {
    await axios.post(cfg.webhookUrl, { content }, { timeout: 15000 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message || err.message };
  }
}

async function publish(text, cfg = {}) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };
  return send(`📢 **New SupraPost**\n\n${text}`, cfg);
}

async function test(cfg = {}) {
  return send("✅ **SupraPost** — this Discord channel is connected.", cfg);
}

module.exports = { id, meta, isConfigured, publish, test };
