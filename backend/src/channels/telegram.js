const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const id = "telegram";

const meta = {
  id,
  name: "Telegram",
  icon: "✈",
  color: "#34b7eb",
  description: "Post to a channel, group, or DM via your bot.",
  fields: [
    { key: "botToken", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF..." },
    { key: "chatId", label: "Chat ID", type: "text", placeholder: "987654321" },
  ],
  helpUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot",
};

function isConfigured(cfg = {}) {
  return !!(cfg.botToken && cfg.chatId);
}

function escapeHtml(str = "") {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendText(text, cfg) {
  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${cfg.botToken}/sendMessage`,
      { chat_id: cfg.chatId, text, parse_mode: "HTML" },
      { timeout: 15000 }
    );
    return { ok: true, data: { messageId: res.data?.result?.message_id } };
  } catch (err) {
    return { ok: false, error: err.response?.data?.description || err.message };
  }
}

async function sendPhoto(text, imagePath, cfg) {
  try {
    const form = new FormData();
    form.append("chat_id", cfg.chatId);
    form.append("caption", text);
    form.append("parse_mode", "HTML");
    form.append("photo", fs.createReadStream(imagePath), {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });

    const res = await axios.post(
      `https://api.telegram.org/bot${cfg.botToken}/sendPhoto`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );
    return { ok: true, data: { messageId: res.data?.result?.message_id } };
  } catch (err) {
    // graceful fallback to text-only if photo fails
    console.warn("[telegram] sendPhoto failed, falling back to text:", err.response?.data?.description || err.message);
    return sendText(text, cfg);
  }
}

async function publish(text, cfg = {}, imagePath = null) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };
  const caption = `📢 <b>New SupraPost</b>\n\n${escapeHtml(text)}`;
  if (imagePath && fs.existsSync(imagePath)) return sendPhoto(caption, imagePath, cfg);
  return sendText(caption, cfg);
}

async function test(cfg = {}) {
  return sendText("✅ <b>SupraPost</b> — this Telegram channel is connected.", cfg);
}

module.exports = { id, meta, isConfigured, publish, test };
