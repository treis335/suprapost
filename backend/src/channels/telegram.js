const axios = require("axios");

/**
 * Telegram channel publisher — implements the common channel interface:
 *   isConfigured(creds) -> boolean
 *   publish(text, creds) -> { ok, ...details }
 *
 * `creds` is per-user: { botToken, chatId }, normally pasted by the user
 * into the Setup > Channels card (Telegram has no OAuth flow for bots).
 * Falls back to TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID from .env if no
 * per-user credentials are set — convenient for local single-user testing,
 * but in production each user should supply their own bot.
 *
 * How a user gets a bot token + chat id:
 *  1. Message @BotFather on Telegram, /newbot, get a token
 *  2. Send any message to their new bot
 *  3. Visit https://api.telegram.org/bot<TOKEN>/getUpdates to find their chat id
 */
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

async function publish(text, creds) {
  const { botToken, chatId } = resolveCreds(creds);

  if (!botToken || !chatId) {
    console.warn("[telegram] Missing bot token or chat id — skipping real post");
    return { ok: false, simulated: true, reason: "not_configured" };
  }

  try {
    const res = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      { chat_id: chatId, text, parse_mode: "HTML" },
      { timeout: 15000 }
    );
    return { ok: true, data: res.data };
  } catch (err) {
    console.error("[telegram] Post failed:", err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}

module.exports = { id: "telegram", isConfigured, publish };
