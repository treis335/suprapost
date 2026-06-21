/**
 * Discord channel publisher — NOT YET IMPLEMENTED.
 *
 *   isConfigured(creds) -> boolean
 *   publish(text, creds) -> { ok, ...details }
 *
 * `creds` holds a per-user Discord webhook URL — the simplest of the
 * bunch, since Discord webhooks need no OAuth flow, just a URL the user
 * generates themselves in their server's channel settings and pastes in.
 */
function isConfigured(creds = {}) {
  return !!creds.webhookUrl;
}

async function publish(text, creds) {
  if (!isConfigured(creds)) {
    return { ok: false, simulated: true, reason: "not_configured" };
  }
  // TODO: implement real Discord webhook POST here using creds.webhookUrl.
  return { ok: false, error: "Discord publishing not implemented yet" };
}

module.exports = { id: "discord", isConfigured, publish };
