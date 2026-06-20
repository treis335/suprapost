/**
 * Instagram channel publisher — NOT YET IMPLEMENTED.
 *
 * Same interface as every other channel module:
 *   isConfigured() -> boolean
 *   publish(text)  -> { ok, ...details }
 *
 * Instagram posting goes through the Instagram Graph API and requires
 * a connected Facebook Business/Creator account, plus (for anything
 * beyond pure text) generated images — Instagram doesn't support
 * text-only posts, so this channel will likely depend on the image
 * generation feature once that's built.
 */
function isConfigured() {
  return !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID);
}

async function publish(text) {
  if (!isConfigured()) {
    return { ok: false, simulated: true, reason: "not_configured" };
  }
  // TODO: implement real Instagram Graph API call here (requires media).
  return { ok: false, error: "Instagram publishing not implemented yet" };
}

module.exports = { id: "instagram", isConfigured, publish };
