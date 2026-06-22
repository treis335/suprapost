const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

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

async function sendText(content, cfg) {
  try {
    await axios.post(cfg.webhookUrl, { content }, { timeout: 15000 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message || err.message };
  }
}

async function sendWithImage(content, imagePath, cfg) {
  try {
    const form = new FormData();
    // Discord webhook with file: payload_json + file attachment
    form.append("payload_json", JSON.stringify({ content }));
    form.append("file", fs.createReadStream(imagePath), {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });

    await axios.post(cfg.webhookUrl, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    return { ok: true };
  } catch (err) {
    console.warn("[discord] sendWithImage failed, falling back to text:", err.response?.data?.message || err.message);
    return sendText(content, cfg);
  }
}

async function publish(text, cfg = {}, imagePath = null) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };
  const content = `📢 **New SupraPost**\n\n${text}`;
  if (imagePath && fs.existsSync(imagePath)) return sendWithImage(content, imagePath, cfg);
  return sendText(content, cfg);
}

async function test(cfg = {}) {
  return sendText("✅ **SupraPost** — this Discord channel is connected.", cfg);
}

module.exports = { id, meta, isConfigured, publish, test };
