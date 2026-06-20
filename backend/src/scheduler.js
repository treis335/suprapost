const { runGenerationCycle } = require("./engine");

let intervalHandle = null;

/**
 * Starts the automation loop. Runs immediately, then every `cycleSeconds`.
 * Survives even if no frontend/browser is connected — this is the whole point:
 * the server is the source of truth, not the browser.
 */
function startAutomation(db) {
  stopAutomation(); // clear any previous loop

  db.data.automation.running = true;
  scheduleNext(db);
  console.log(`[scheduler] Automation started — cycle every ${db.data.automation.cycleSeconds}s`);
}

function scheduleNext(db) {
  const cycleMs = db.data.automation.cycleSeconds * 1000;
  db.data.automation.nextRunAt = new Date(Date.now() + cycleMs).toISOString();

  intervalHandle = setTimeout(async () => {
    await db.read();
    if (!db.data.automation.running) return;

    const { autoApprove } = db.data.automation;
    await runGenerationCycle(db, { autoPost: autoApprove });

    await db.read(); // re-read in case settings changed mid-cycle
    if (db.data.automation.running) {
      scheduleNext(db);
    }
  }, cycleMs);
}

async function stopAutomation(db) {
  if (intervalHandle) {
    clearTimeout(intervalHandle);
    intervalHandle = null;
  }
  if (db) {
    db.data.automation.running = false;
    db.data.automation.nextRunAt = null;
    await db.write();
  }
  console.log("[scheduler] Automation stopped");
}

module.exports = { startAutomation, stopAutomation };
