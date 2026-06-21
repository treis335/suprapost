/**
 * Instagram channel publisher — NOT YET IMPLEMENTED.
 *
 *   isConfigured(creds) -> boolean
 *   publish(text, creds) -> { ok, ...details }
 *
 * `creds` will hold a per-user Instagram Graph API access token + account
 * id, obtained via Facebook Login (Instagram posting requires a connected
 * Facebook Business/Creator account). Instagram doesn't support text-only
 * posts, so this channel will likely depend on the image generation
 * feature once that's built.
 */
function isConfigured(creds = {}) {
  return !!(creds.accessToken && creds.accountId);
}

async function publish(text, creds) {
  if (!isConfigured(creds)) {
    return { ok: false, simulated: true, reason: "not_configured" };
  }
  // TODO: implement real Instagram Graph API call here (requires media).
  return { ok: false, error: "Instagram publishing not implemented yet" };
}

module.exports = { id: "instagram", isConfigured, publish };
