const telegram = require("./telegram");
const discord = require("./discord");
const twitter = require("./twitter");
const instagram = require("./instagram");

/**
 * Channel registry — the single place that knows which social
 * networks SupraPost can publish to. Adding a new network later is:
 *   1. create backend/src/channels/<network>.js implementing
 *      { id, meta, isConfigured(cfg), publish(text, cfg), test(cfg) }
 *   2. require it + add it to ORDER below
 * Nothing else in the app needs to change — server.js, engine.js and
 * the frontend Channels tab are all driven by this registry.
 */
const ORDER = ["telegram", "discord", "twitter", "instagram"];
const REGISTRY = { telegram, discord, twitter, instagram };

function list() {
  return ORDER.map((channelId) => REGISTRY[channelId]);
}

function get(channelId) {
  return REGISTRY[channelId];
}

/**
 * Publishes text to every channel that is enabled in channelsConfig.
 * Returns a map of { [channelId]: { ok, simulated?, error?, data? } }
 * so the caller can show a per-network breakdown instead of one
 * pass/fail flag.
 */
async function publishToChannels(text, channelsConfig = {}) {
  const results = {};
  for (const channelId of ORDER) {
    const cfg = channelsConfig[channelId];
    if (!cfg || !cfg.enabled) continue;
    const channel = REGISTRY[channelId];
    try {
      results[channelId] = await channel.publish(text, cfg);
    } catch (err) {
      results[channelId] = { ok: false, error: err.message };
    }
  }
  return results;
}

module.exports = { list, get, publishToChannels, ORDER };
