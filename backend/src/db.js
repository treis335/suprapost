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
  posts: [], // { id, text, scores, time, auto, posted }
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

async function initDB() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) {
    db.data = JSON.parse(JSON.stringify(defaultData));
    await db.write();
  } else {
    await db.read();
    // ensure any newly-added default keys exist on older saved files
    db.data = { ...JSON.parse(JSON.stringify(defaultData)), ...db.data };
    await db.write();
  }
  return db;
}

module.exports = { db, initDB };
