/**
 * Discord channel publisher — NOT YET IMPLEMENTED.
 *
 * Same interface as every other channel module:
 *   isConfigured() -> boolean
 *   publish(text)  -> { ok, ...details }
 *
 * Easiest of the bunch to add for real: Discord supports simple
 * incoming webhooks, so this would just be a POST to a webhook URL
 * with no OAuth flow needed.
 */
function isConfigured() {
  return !!process.env.DISCORD_WEBHOOK_URL;
}

async function publish(text) {
  if (!isConfigured()) {
    return { ok: false, simulated: true, reason: "not_configured" };
  }
  // TODO: implement real Discord webhook POST here.
  return { ok: false, error: "Discord publishing not implemented yet" };
}

module.exports = { id: "discord", isConfigured, publish };
