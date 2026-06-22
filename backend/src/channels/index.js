const telegram  = require("./telegram");
const twitter   = require("./twitter");
const instagram = require("./instagram");
const discord   = require("./discord");

const registry = { telegram, twitter, instagram, discord };

/**
 * Publishes a payload to channels.
 *
 * payload = { text, imagePath, mode }
 *   mode: "text" | "image" | "both"
 *
 * channelsState = { telegram: { enabled, credentials }, ... }
 *
 * targetIds (optional) = ["telegram", "discord"]
 *   When provided, only those channels are published to even if others are enabled.
 *   Lets the user pick per-post which networks to hit.
 */
async function publishToChannels(payload, channelsState, targetIds = null) {
  const results = {};

  for (const [id, mod] of Object.entries(registry)) {
    const state = channelsState?.[id];
    if (!state?.enabled) continue;
    if (targetIds && !targetIds.includes(id)) continue; // per-post override

    const creds = state.credentials || {};
    if (!mod.isConfigured(creds)) {
      results[id] = { ok: false, simulated: true, reason: "not_configured" };
      continue;
    }

    try {
      results[id] = await mod.publish(payload, creds);
    } catch (err) {
      results[id] = { ok: false, error: err.message };
    }
  }

  return results;
}

module.exports = { registry, publishToChannels };
