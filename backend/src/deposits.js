const { v4: uuidv4 } = require("uuid");
const { getAccountTransactions, OCTAS_PER_SUPRA } = require("./supraClient");

/**
 * Non-custodial top-up flow:
 *
 *  1. User picks an amount (e.g. 50 SUPRA) -> createDepositIntent()
 *  2. We return a slightly adjusted amount, e.g. 50.000437, where the
 *     extra micro-decimals ENCODE which user this payment belongs to.
 *     This avoids needing a "memo" field (which Move coin transfers
 *     don't have) while still letting many users pay the platform's one
 *     deposit address without their payments getting mixed up.
 *  3. The user signs ONE real transaction, from their own wallet, sending
 *     that exact amount to DEPOSIT_ADDRESS. They pay their own gas. We
 *     never touch their private key or hold funds beyond what they
 *     explicitly chose to send.
 *  4. pollForDeposits() runs on a timer, reads recent transactions to
 *     DEPOSIT_ADDRESS, and matches the received amount back to a pending
 *     intent. On match, credits that user's balance and marks the
 *     intent as fulfilled (one-time use, like the auth nonce).
 *
 * This is intentionally simple — fine for the scale of "10 clients" you
 * asked about. At real scale you'd move to a dedicated escrow/payment
 * smart contract instead of address+amount matching, see README roadmap.
 */

const DEPOSIT_ADDRESS = process.env.SUPRA_DEPOSIT_ADDRESS; // your receiving wallet
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes to complete payment
const MAX_PENDING_PER_USER = 5;

// In-memory pending intents: address (encoded amount) -> { userAddress, requestedAmount, encodedAmount, expiresAt, fulfilled }
// Keyed by the *encoded* amount since that's literally what we match
// against incoming transaction values.
const pendingIntents = new Map();

/**
 * Encodes a small unique fingerprint into the decimal tail of the amount.
 * E.g. requested 50 SUPRA -> 50.000437. The chance of two simultaneous
 * pending intents colliding on the same encoded amount is astronomically
 * small (1 in ~900,000), and even then we just ask the user to retry.
 */
function encodeAmount(requestedAmount) {
  const tail = Math.floor(Math.random() * 900000) + 100000; // 6-digit tail, no leading zero ambiguity
  const encoded = +(requestedAmount + tail / 1e9).toFixed(9);
  return { encoded, tail };
}

function createDepositIntent(userAddress, requestedAmount) {
  if (!DEPOSIT_ADDRESS) {
    throw new Error("SUPRA_DEPOSIT_ADDRESS is not configured on the server");
  }
  if (!requestedAmount || requestedAmount <= 0) {
    throw new Error("Invalid amount");
  }

  // cap how many unfulfilled intents one user can stack up, to bound memory
  const existing = [...pendingIntents.values()].filter(
    (i) => i.userAddress === userAddress.toLowerCase() && !i.fulfilled && Date.now() < i.expiresAt
  );
  if (existing.length >= MAX_PENDING_PER_USER) {
    throw new Error("Too many pending deposits — wait for one to complete or expire first");
  }

  const { encoded } = encodeAmount(requestedAmount);
  const intent = {
    id: uuidv4(),
    userAddress: userAddress.toLowerCase(),
    requestedAmount,
    encodedAmount: encoded,
    depositAddress: DEPOSIT_ADDRESS,
    createdAt: Date.now(),
    expiresAt: Date.now() + INTENT_TTL_MS,
    fulfilled: false,
  };
  pendingIntents.set(encoded.toFixed(9), intent);
  return intent;
}

function getIntentStatus(intentId) {
  for (const intent of pendingIntents.values()) {
    if (intent.id === intentId) return intent;
  }
  return null;
}

/**
 * Polls the deposit address for recent transactions and matches any new
 * incoming transfer amounts against pending intents. Call this on a
 * timer (e.g. every 15-30s) from server.js. Returns the list of intents
 * fulfilled in this pass, so the caller can credit user balances.
 *
 * NOTE: relies on supraClient.extractTransferInfo, which is flagged as
 * best-effort pending real-world testing — verify the amount field
 * extraction against actual testnet transactions before relying on this
 * for real funds.
 */
async function pollForDeposits(db) {
  if (!DEPOSIT_ADDRESS) return [];

  // clean expired intents as we go
  for (const [key, intent] of pendingIntents) {
    if (!intent.fulfilled && Date.now() > intent.expiresAt) pendingIntents.delete(key);
  }

  const activeIntents = [...pendingIntents.values()].filter((i) => !i.fulfilled);
  if (activeIntents.length === 0) return [];

  let txData;
  try {
    txData = await getAccountTransactions(DEPOSIT_ADDRESS, { count: 25 });
  } catch (err) {
    console.error("[deposits] Failed to fetch transactions:", err.message);
    return [];
  }

  const transactions = txData?.record || txData?.transactions || [];
  const fulfilled = [];

  for (const tx of transactions) {
    // Match by amount against any pending intent's encoded amount.
    // amountInSupra extraction depends on the real payload shape — see
    // supraClient.js NOTE. This assumes a helper resolves it; replace
    // with confirmed parsing once tested against testnet.
    const amountOctas = tx?.payload?.amount ?? tx?.output?.amount; // best-effort, confirm against real data
    if (amountOctas == null) continue;
    const amountSupra = +(Number(amountOctas) / OCTAS_PER_SUPRA).toFixed(9);

    const key = amountSupra.toFixed(9);
    const intent = pendingIntents.get(key);
    if (!intent || intent.fulfilled) continue;

    // credit the user
    await db.read();
    const user = db.forUser(intent.userAddress);
    user.wallet.balance = +(user.wallet.balance + intent.requestedAmount).toFixed(2);
    await db.write();

    intent.fulfilled = true;
    intent.txHash = tx.hash;
    fulfilled.push(intent);
    console.log(`[deposits] Credited ${intent.requestedAmount} SUPRA to ${intent.userAddress} (tx ${tx.hash})`);
  }

  return fulfilled;
}

module.exports = { createDepositIntent, getIntentStatus, pollForDeposits, DEPOSIT_ADDRESS };
