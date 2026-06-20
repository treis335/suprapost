/**
 * Channel registry. Every platform module here implements the same
 * interface — { id, isConfigured(), publish(text) } — so adding a new
 * social network is just: drop a new file in this folder, then add one
 * line below.
 */
const telegram = require("./telegram");
const twitter = require("./twitter");
const instagram = require("./instagram");
const discord = require("./discord");

const registry = { telegram, twitter, instagram, discord };

/**
 * Publishes `text` to every channel that is both enabled by the user
 * (db.data.channels[id].enabled) and actually configured with real
 * credentials (module.isConfigured()). Returns a map of per-channel
 * results so the caller can show exactly what succeeded or failed.
 */
async function publishToChannels(text, channelsState) {
  const results = {};

  for (const [id, mod] of Object.entries(registry)) {
    const state = channelsState?.[id];
    if (!state?.enabled) continue; // user didn't opt this channel in

    if (!mod.isConfigured()) {
      results[id] = { ok: false, simulated: true, reason: "not_configured" };
      continue;
    }

    try {
      results[id] = await mod.publish(text);
    } catch (err) {
      results[id] = { ok: false, error: err.message };
    }
  }

  return results;
}

module.exports = { registry, publishToChannels };
