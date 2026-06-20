const axios = require("axios");

/**
 * Posts a message to a Telegram chat via the Bot API.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env
 *
 * How to get TELEGRAM_CHAT_ID:
 *  1. Send any message to your bot in Telegram
 *  2. Visit: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
 *  3. Find "chat":{"id": ...} in the JSON response
 */
async function postToTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — skipping real post");
    return { ok: false, simulated: true };
  }

  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      },
      { timeout: 15000 }
    );
    return { ok: true, data: res.data };
  } catch (err) {
    console.error("[telegram] Post failed:", err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}

module.exports = { postToTelegram };
