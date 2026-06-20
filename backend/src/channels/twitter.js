/**
 * Twitter/X channel publisher — NOT YET IMPLEMENTED.
 *
 * Same interface as every other channel module:
 *   isConfigured() -> boolean
 *   publish(text)  -> { ok, ...details }
 *
 * To wire this up for real, you'll need:
 *   1. A Twitter Developer App (developer.twitter.com) with OAuth 2.0
 *      User Context enabled (posting requires user-context auth, not
 *      just app-only bearer tokens).
 *   2. Per-user access + refresh tokens stored after the OAuth flow
 *      (this becomes relevant once SupraPost is multi-user — for now
 *      a single set of tokens in .env is enough for personal use).
 *   3. POST https://api.twitter.com/2/tweets with the access token.
 *
 * Until then, this module always reports itself as unconfigured, so the
 * engine safely skips it without crashing — channels.twitter.connected
 * stays false in the dashboard until this is filled in.
 */
function isConfigured() {
  return !!(process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_SECRET);
}

async function publish(text) {
  if (!isConfigured()) {
    return { ok: false, simulated: true, reason: "not_configured" };
  }
  // TODO: implement real Twitter API v2 call here.
  return { ok: false, error: "Twitter publishing not implemented yet" };
}

module.exports = { id: "twitter", isConfigured, publish };
