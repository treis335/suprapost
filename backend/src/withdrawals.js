const { v4: uuidv4 } = require("uuid");

/**
 * Withdrawals — referral credits only.
 *
 * Deposited balance (wallet.balance) is never withdrawable: it exists to be
 * spent inside the platform. Referral commissions (wallet.creditBalance) are
 * a real reward the user didn't put in themselves, so they can cash it out.
 *
 * There is no automatic on-chain payout wired up yet — sending real SUPRA
 * from a platform-held key is high-stakes and needs its own signing/security
 * review before going live. Every request here is deducted from the user's
 * creditBalance immediately (so it can't be spent twice) and recorded as
 * "pending" for manual payout by the platform operator. Once an automated
 * payout path exists, this module is the only place that needs to change.
 */

const MIN_WITHDRAWAL = 1; // SUPRA
const MAX_PENDING_PER_USER = 3;

async function requestWithdrawal(db, address, amount, toAddress) {
  await db.read();
  const user = db.forUser(address);
  user.wallet.withdrawals = user.wallet.withdrawals || [];
  user.wallet.creditBalance = user.wallet.creditBalance || 0;

  const amt = Number(amount);
  if (!amt || amt <= 0 || !isFinite(amt)) {
    return { ok: false, error: "Invalid amount." };
  }
  if (amt < MIN_WITHDRAWAL) {
    return { ok: false, error: `Minimum withdrawal is ${MIN_WITHDRAWAL} SUPRA.` };
  }
  if (amt > user.wallet.creditBalance) {
    return { ok: false, error: "Amount exceeds your available referral credits." };
  }
  const pendingCount = user.wallet.withdrawals.filter(w => w.status === "pending").length;
  if (pendingCount >= MAX_PENDING_PER_USER) {
    return { ok: false, error: "You already have pending withdrawal requests — wait for them to clear." };
  }

  const dest = (toAddress || address).replace(/^0x/, "").toLowerCase();
  const record = {
    id: uuidv4(),
    amount: +amt.toFixed(8),
    toAddress: dest,
    status: "pending", // pending → paid | rejected
    createdAt: Date.now(),
    txHash: null,
  };

  user.wallet.creditBalance = +(user.wallet.creditBalance - amt).toFixed(8);
  user.wallet.withdrawals.unshift(record);
  if (user.wallet.withdrawals.length > 50) user.wallet.withdrawals = user.wallet.withdrawals.slice(0, 50);

  await db.write();
  console.log(`[withdraw] ${address} requested ${amt} SUPRA → ${dest} (pending)`);
  return { ok: true, withdrawal: record, creditBalance: user.wallet.creditBalance };
}

module.exports = { requestWithdrawal, MIN_WITHDRAWAL };
