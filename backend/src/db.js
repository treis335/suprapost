const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const file = path.join(dataDir, "db.json");

const defaultData = {
  // user settings — single-user for now, will become multi-user later
  settings: {
    niche: "",
    tone: "technical",
    audience: "",
    examples: "",
    avoid: "",
    postType: "alpha",
    customPrompt: "",
  },
  // per-network publishing config. Each key matches a channel id in
  // backend/src/channels/. New networks just need a new key here +
  // a matching module — server.js and engine.js stay untouched.
  channels: {
    telegram: { enabled: true, botToken: "", chatId: "" },
    discord: { enabled: false, webhookUrl: "" },
    twitter: { enabled: false, apiKey: "", apiSecret: "", accessToken: "", accessSecret: "" },
    instagram: { enabled: false, accessToken: "", igUserId: "" },
  },
  automation: {
    running: false,
    cycleSeconds: 21600, // 6h default
    autoApprove: true,
    nextRunAt: null,
  },
  wallet: {
    balance: 50, // simulated SUPRA balance for now
    costPerPost: 1,
  },
  stats: {
    totalGenerations: 0,
    totalPosts: 0,
    supraEarned: 0,
  },
  posts: [], // { id, text, scores, time, auto, posted, channelResults }
};

/**
 * Minimal lowdb-compatible wrapper around a plain JSON file.
 * Exposes the same shape we use elsewhere: db.data, db.read(), db.write()
 */
class JsonDB {
  constructor(filePath, defaults) {
    this.filePath = filePath;
    this.defaults = defaults;
    this.data = null;
  }

  async read() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      this.data = JSON.parse(raw);
    } catch (err) {
      // file doesn't exist yet or is corrupt — fall back to defaults
      this.data = this.data || JSON.parse(JSON.stringify(this.defaults));
    }
    return this.data;
  }

  async write() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }
}

const db = new JsonDB(file, defaultData);

/**
 * Merges saved data on top of fresh defaults, one level deep, so that
 * new top-level keys (e.g. a config block for a brand new channel)
 * automatically appear for users with an older db.json — without
 * clobbering values the user already configured for existing ones.
 */
function mergeDefaults(saved) {
  const merged = { ...JSON.parse(JSON.stringify(defaultData)), ...saved };
  merged.channels = { ...JSON.parse(JSON.stringify(defaultData.channels)), ...(saved.channels || {}) };
  for (const channelId of Object.keys(defaultData.channels)) {
    merged.channels[channelId] = { ...defaultData.channels[channelId], ...(saved.channels?.[channelId] || {}) };
  }
  return merged;
}

/**
 * One-time convenience: if the classic .env Telegram credentials are
 * present and the dashboard hasn't been configured yet, seed the
 * Telegram channel from them so existing setups keep working with
 * zero migration steps.
 */
function seedFromEnv(data) {
  const t = data.channels.telegram;
  if (process.env.TELEGRAM_BOT_TOKEN && !t.botToken) {
    t.botToken = process.env.TELEGRAM_BOT_TOKEN;
    t.chatId = process.env.TELEGRAM_CHAT_ID || t.chatId;
    t.enabled = true;
  }
  return data;
}

async function initDB() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) {
    db.data = seedFromEnv(JSON.parse(JSON.stringify(defaultData)));
    await db.write();
  } else {
    await db.read();
    db.data = seedFromEnv(mergeDefaults(db.data));
    await db.write();
  }
  return db;
}

module.exports = { db, initDB };
