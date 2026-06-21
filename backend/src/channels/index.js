/**
 * Channel registry. Every platform module here implements the same
 * interface — { id, isConfigured(creds), publish(text, creds) } — so
 * adding a new social network is just: drop a new file in this folder,
 * then add one line below.
 */
const telegram = require("./telegram");
const twitter = require("./twitter");
const instagram = require("./instagram");
const discord = require("./discord");

const registry = { telegram, twitter, instagram, discord };

/**
 * Publishes `text` to every channel that is both enabled by the user
 * (channelsState[id].enabled) and actually configured with real
 * credentials (module.isConfigured(creds)). `channelsState` is the user's
 * own channels object — { telegram: { enabled, credentials, ... }, ... } —
 * so each user's broadcast only ever touches their own tokens.
 */
async function publishToChannels(text, channelsState) {
  const results = {};

  for (const [id, mod] of Object.entries(registry)) {
    const state = channelsState?.[id];
    if (!state?.enabled) continue; // user didn't opt this channel in

    const creds = state.credentials || {};
    if (!mod.isConfigured(creds)) {
      results[id] = { ok: false, simulated: true, reason: "not_configured" };
      continue;
    }

    try {
      results[id] = await mod.publish(text, creds);
    } catch (err) {
      results[id] = { ok: false, error: err.message };
    }
  }

  return results;
}

module.exports = { registry, publishToChannels };
