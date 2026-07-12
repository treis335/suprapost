const { runGenerationCycle } = require("./engine");

// One timer per wallet address — each user's automation runs independently.
const timers = new Map();

async function startAutomation(db, address) {
  await stopAutomation(db, address, { persist: false });
  const user = db.forUser(address);
  user.automation.running = true;
  await scheduleNext(db, address);
  console.log(`[scheduler] Started for ${address} — cycle every ${user.automation.cycleSeconds}s`);
}

async function scheduleNext(db, address) {
  const user = db.forUser(address);
  const cycleMs = user.automation.cycleSeconds * 1000;
  user.automation.nextRunAt = new Date(Date.now() + cycleMs).toISOString();
  await db.write();

  const handle = setTimeout(async () => {
    await db.read();
    const u = db.forUser(address);
    if (!u.automation.running) return;

    const { autoApprove, mode, imageStyle, imageCustomPrompt } = u.automation;
    const result = await runGenerationCycle(db, address, {
      autoPost: autoApprove,
      mode:              mode              || "text",
      imageStyle:        imageStyle        || "auto",
      imageCustomPrompt: imageCustomPrompt || "",
    });

    // Stop automation if generation failed (e.g. image API out of credits)
    // or if balance is insufficient — no point retrying endlessly
    if (!result.ok && (result.reason === "generation_failed" || result.reason === "insufficient_balance")) {
      console.log(`[scheduler] Stopping automation for ${address} — reason: ${result.reason}`);
      await stopAutomation(db, address, { persist: true });
      return;
    }

    await db.read();
    if (db.forUser(address).automation.running) await scheduleNext(db, address);
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
