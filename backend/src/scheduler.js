const { runGenerationCycle } = require("./engine");

// One timer per wallet address — each user's automation runs independently.
const timers = new Map();

function startAutomation(db, address) {
  stopAutomation(db, address, { persist: false });
  const user = db.forUser(address);
  user.automation.running = true;
  scheduleNext(db, address);
  console.log(`[scheduler] Started for ${address} — cycle every ${user.automation.cycleSeconds}s`);
}

function scheduleNext(db, address) {
  const user = db.forUser(address);
  const cycleMs = user.automation.cycleSeconds * 1000;
  user.automation.nextRunAt = new Date(Date.now() + cycleMs).toISOString();

  const handle = setTimeout(async () => {
    await db.read();
    const u = db.forUser(address);
    if (!u.automation.running) return;

    const { autoApprove, mode, imageStyle, imageCustomPrompt } = u.automation;
    await runGenerationCycle(db, address, {
      autoPost: autoApprove,
      mode:              mode              || "text",
      imageStyle:        imageStyle        || "auto",
      imageCustomPrompt: imageCustomPrompt || "",
    });

    await db.read();
    if (db.forUser(address).automation.running) scheduleNext(db, address);
  }, cycleMs);

  timers.set(address.toLowerCase(), handle);
}

async function stopAutomation(db, address, { persist = true } = {}) {
  const key = address.toLowerCase();
  if (timers.has(key)) { clearTimeout(timers.get(key)); timers.delete(key); }
  if (db && persist) {
    const user = db.forUser(address);
    user.automation.running = false;
    user.automation.nextRunAt = null;
    await db.write();
  }
  console.log(`[scheduler] Stopped for ${address}`);
}

function resumeAllAutomations(db) {
  for (const [address, user] of Object.entries(db.data.users || {})) {
    if (user.automation?.running) {
      console.log(`[scheduler] Resuming ${address}...`);
      startAutomation(db, address);
    }
  }
}

module.exports = { startAutomation, stopAutomation, resumeAllAutomations };
