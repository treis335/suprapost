const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const file = path.join(dataDir, "db.json");

/**
 * Per-user data shape. One of these lives at db.data.users[walletAddress].
 * The wallet address IS the user ID — no separate accounts table, no
 * passwords. Whoever can sign a message with that address's private key
 * owns this slice of data.
 */
function freshUserData() {
  return {
    settings: {
      niche: "",
      tone: "technical",
      audience: "",
      examples: "",
      avoid: "",
      postType: "alpha",
      customPrompt: "",
    },
    // Channels this post can be broadcast to. Each channel is independently
    // enabled by the user — generation happens once, then the engine fans
    // the same post out to every channel where enabled=true and connected=true.
    // New platforms (Twitter/X, Instagram, Discord...) just get appended here
    // and a matching publisher module in backend/src/channels/.
    //
    // credentials: per-user secrets for channels that require the user to
    // paste their own token (Telegram bot token, Discord webhook, etc.)
    // rather than going through OAuth. These are never sent back to the
    // frontend in full — only a masked preview (see server.js).
    channels: {
      telegram: { label: "Telegram", connected: false, enabled: false, icon: "telegram", credentials: {} },
      twitter: { label: "Twitter / X", connected: false, enabled: false, icon: "twitter", credentials: {} },
      instagram: { label: "Instagram", connected: false, enabled: false, icon: "instagram", credentials: {} },
      discord: { label: "Discord", connected: false, enabled: false, icon: "discord", credentials: {} },
    },
    automation: {
      running: false,
      cycleSeconds: 21600,
      autoApprove: true,
      nextRunAt: null,
      mode: "text",       // "text" | "image" | "both"
      imageStyle: "auto",
      imageCustomPrompt: "",
    },
    wallet: {
      balance: 0,
      costPerPost: 1,
    },
    stats: {
      totalGenerations: 0,
      totalPosts: 0,
      supraEarned: 0,
    },
    posts: [], // { id, text, scores, time, auto, results: { telegram: {...}, twitter: {...} } }
  };
}

const defaultData = {
  users: {}, // keyed by lowercase wallet address
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
      this.data = this.data || JSON.parse(JSON.stringify(this.defaults));
    }
    return this.data;
  }

  async write() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  /**
   * Returns the per-user data object for this wallet address, creating it
   * (with sane defaults) on first access. Always call db.read() before and
   * db.write() after if you mutate the result.
   */
  forUser(address) {
    const key = address.toLowerCase();
    if (!this.data.users[key]) {
      this.data.users[key] = freshUserData();
    }
    return this.data.users[key];
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
    // Fresh install: seed a "legacy" user from .env Telegram credentials if present
    const fresh = freshUserData();
    seedFromEnv(fresh);
    db.data = { users: { legacy: fresh } };
    await db.write();
    return db;
  }

  await db.read();

  // Migration: older single-user installs had data at the top level
  // (db.data.settings, db.data.posts, etc.) instead of under db.data.users.
  // Move that into a "legacy" user bucket once, so nobody loses their
  // existing local test data when upgrading.
  const looksLegacy = !db.data.users && (db.data.settings || db.data.posts || db.data.wallet);
  if (looksLegacy) {
    const legacy = freshUserData();
    legacy.settings = { ...legacy.settings, ...(db.data.settings || {}) };
    legacy.automation = { ...legacy.automation, ...(db.data.automation || {}) };
    legacy.wallet = { ...legacy.wallet, ...(db.data.wallet || {}) };
    legacy.stats = { ...legacy.stats, ...(db.data.stats || {}) };
    legacy.posts = db.data.posts || [];
    if (db.data.channels) {
      legacy.channels = Object.fromEntries(
        Object.entries(legacy.channels).map(([id, def]) => [
          id,
          { ...def, ...(db.data.channels[id] || {}) },
        ])
      );
    }
    db.data = { users: { legacy } };
    console.log("[db] Migrated legacy single-user data into users.legacy");
  }

  db.data.users ||= {};
  await db.write();
  return db;
}

module.exports = { db, initDB, freshUserData };
