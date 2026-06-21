/**
 * Twitter/X channel publisher — NOT YET IMPLEMENTED.
 *
 *   isConfigured(creds) -> boolean
 *   publish(text, creds) -> { ok, ...details }
 *
 * `creds` will eventually hold per-user OAuth 2.0 access/refresh tokens
 * obtained via the Twitter OAuth flow (the user clicks "Connect Twitter",
 * is redirected to twitter.com, authorizes, and Twitter calls back with
 * tokens scoped to that user — never a raw API key typed into a form).
 *
 * To wire this up for real:
 *   1. Register a Twitter Developer App with OAuth 2.0 User Context.
 *   2. Add a /api/oauth/twitter/start + /api/oauth/twitter/callback route
 *      pair in the backend that runs the OAuth dance and stores the
 *      resulting tokens in db.forUser(address).channels.twitter.credentials.
 *   3. POST https://api.twitter.com/2/tweets using the user's access token.
 */
function isConfigured(creds = {}) {
  return !!(creds.accessToken);
}

async function publish(text, creds) {
  if (!isConfigured(creds)) {
    return { ok: false, simulated: true, reason: "not_configured" };
  }
  // TODO: implement real Twitter API v2 call here using creds.accessToken.
  return { ok: false, error: "Twitter publishing not implemented yet" };
}

module.exports = { id: "twitter", isConfigured, publish };
