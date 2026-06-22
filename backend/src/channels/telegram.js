const axios = require("axios");

/**
 * Telegram channel — Bot API.
 * Real, fully working publisher. Config can come from the dashboard
 * (db.data.channels.telegram) or fall back to .env on first run.
 */
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

async function send(rawText, cfg) {
  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${cfg.botToken}/sendMessage`,
      { chat_id: cfg.chatId, text: rawText, parse_mode: "HTML" },
      { timeout: 15000 }
    );
    return { ok: true, data: { messageId: res.data?.result?.message_id } };
  } catch (err) {
    return { ok: false, error: err.response?.data?.description || err.message };
  }
}

async function publish(text, cfg = {}) {
  if (!isConfigured(cfg)) return { ok: false, simulated: true, reason: "not_configured" };
  const formatted = `📢 <b>New SupraPost</b>\n\n${escapeHtml(text)}`;
  return send(formatted, cfg);
}

async function test(cfg = {}) {
  return send("✅ <b>SupraPost</b> — this Telegram channel is connected.", cfg);
}

module.exports = { id, meta, isConfigured, publish, test };
