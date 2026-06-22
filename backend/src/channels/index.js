const telegram = require("./telegram");
const discord = require("./discord");
const twitter = require("./twitter");
const instagram = require("./instagram");

const ORDER = ["telegram", "discord", "twitter", "instagram"];
const REGISTRY = { telegram, discord, twitter, instagram };

function list() {
  return ORDER.map((id) => REGISTRY[id]);
}

function get(channelId) {
  return REGISTRY[channelId];
}

/**
 * Publishes text (+ optional image) to every enabled channel.
 * Each channel's publish(text, cfg, imagePath) signature is uniform,
 * so new channels get image support for free once they implement it.
 */
async function publishToChannels(text, channelsConfig = {}, imagePath = null) {
  const results = {};
  for (const channelId of ORDER) {
    const cfg = channelsConfig[channelId];
    if (!cfg || !cfg.enabled) continue;
    const channel = REGISTRY[channelId];
    try {
      results[channelId] = await channel.publish(text, cfg, imagePath);
    } catch (err) {
      results[channelId] = { ok: false, error: err.message };
    }
  }
  return results;
}

module.exports = { list, get, publishToChannels, ORDER };
