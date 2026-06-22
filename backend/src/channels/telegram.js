const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

function resolveCreds(creds = {}) {
  return {
    botToken: creds.botToken || process.env.TELEGRAM_BOT_TOKEN,
    chatId: creds.chatId || process.env.TELEGRAM_CHAT_ID,
  };
}

function isConfigured(creds) {
  const { botToken, chatId } = resolveCreds(creds);
  return !!(botToken && chatId);
}

async function publish({ text, imagePath, mode }, creds) {
  const { botToken, chatId } = resolveCreds(creds);
  if (!botToken || !chatId) return { ok: false, simulated: true, reason: "not_configured" };

  try {
    // Image only or Text+Image → sendPhoto
    if ((mode === "image" || mode === "both") && imagePath && fs.existsSync(imagePath)) {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("photo", fs.createReadStream(imagePath), { filename: "image.jpg", contentType: "image/jpeg" });
      if (mode === "both" && text) {
        form.append("caption", `📢 ${text}`);
        form.append("parse_mode", "HTML");
      }
      const res = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, form, { headers: form.getHeaders(), timeout: 30000 });
      return { ok: true, data: { messageId: res.data?.result?.message_id } };
    }

    // Text only → sendMessage
    const res = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      { chat_id: chatId, text: `📢 ${text}`, parse_mode: "HTML" },
      { timeout: 15000 }
    );
    return { ok: true, data: { messageId: res.data?.result?.message_id } };
  } catch (err) {
    return { ok: false, error: err.response?.data?.description || err.message };
  }
}

module.exports = { id: "telegram", isConfigured, publish };
