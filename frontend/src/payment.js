/**
 * SupraPost Payment Module
 *
 * Handles SUPRA deposits using StarKey wallet directly from the browser.
 *
 * Flow:
 *  1. Backend creates a "fingerprinted" intent (unique amount encodes the user)
 *  2. Frontend uses StarKey to send the transaction — browser has full RPC access
 *  3. StarKey returns the tx hash immediately after the user confirms
 *  4. Frontend sends the hash to the backend to verify + credit the balance
 *
 * The server never needs to poll the Supra RPC — the browser handles everything.
 */

const SUPRA_MODULE = "0000000000000000000000000000000000000000000000000000000000000001";
const SUPRA_COIN_TYPE = "0x1::supra_coin::SupraCoin";
const OCTAS_PER_SUPRA = 1e8;

// ── BCS helpers ──────────────────────────────────────────────────────────────
// Minimal BCS serialization for u64 (little-endian 8 bytes).
// Avoids needing an npm package — mirrors what the supra-l1-sdk does internally.

function bcsSerializeU64(value) {
  const bigVal = BigInt(value);
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number((bigVal >> BigInt(i * 8)) & BigInt(0xff));
  }
  return bytes;
}

function hexToBytes(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ── StarKey helpers ───────────────────────────────────────────────────────────

function getProvider() {
  return window?.starkey?.supra ?? null;
}

/**
 * Sends SUPRA from the connected wallet to a recipient address.
 * Uses the exact StarKey API format from docs.supra.com.
 *
 * @param {string} fromAddress  - sender wallet address (connected account)
 * @param {string} toAddress    - recipient address
 * @param {number} amountSupra  - amount in SUPRA (e.g. 10.00004265)
 * @returns {Promise<string>}   - transaction hash
 */
async function sendSupraTransfer(fromAddress, toAddress, amountSupra) {
  const provider = getProvider();
  if (!provider) throw new Error("StarKey not detected — install it from starkey.app");

  // Convert to octas (u64), round to avoid float issues
  const amountOctas = Math.round(amountSupra * OCTAS_PER_SUPRA);

  // StarKey raw transaction payload format (from official docs):
  // [sender, sequence_number, module_address, module_name, function_name,
  //  type_args, args, optionalArgs]
  const txExpiryTime = Math.ceil(Date.now() / 1000) + 60; // 60s window
  const optionalArgs = { txExpiryTime: BigInt(txExpiryTime) };

  const rawTxPayload = [
    fromAddress,
    0,                    // sequence number — StarKey fills this in
    SUPRA_MODULE,
    "supra_account",
    "transfer",
    [],                   // type arguments (none for native SUPRA)
    [
      hexToBytes(toAddress),
      bcsSerializeU64(amountOctas),
    ],
    optionalArgs,
  ];

  // Step 1: build the raw transaction bytes
  const rawTxData = await provider.createRawTransactionData(rawTxPayload);
  if (!rawTxData) throw new Error("StarKey failed to create raw transaction data");

  // Step 2: sign and submit — opens the StarKey popup for user confirmation
  const txHash = await provider.sendTransaction({ data: rawTxData });
  if (!txHash) throw new Error("StarKey did not return a transaction hash");

  return txHash;
}

// ── Backend API calls ─────────────────────────────────────────────────────────

function getAuthHeaders() {
  try {
    const raw = sessionStorage.getItem("suprapost_session");
    const session = raw ? JSON.parse(raw) : null;
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
  } catch {
    return {};
  }
}

async function apiCreateIntent(amountSupra) {
  const res = await fetch("/api/wallet/deposit/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ amount: amountSupra }),
  });
  return res.json();
}

async function apiConfirmDeposit(intentId, txHash) {
  const res = await fetch("/api/wallet/deposit/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ intentId, txHash }),
  });
  return res.json();
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Full deposit flow: intent → StarKey tx → backend confirm.
 *
 * @param {string}   walletAddress  - connected wallet address
 * @param {number}   amountSupra    - amount user wants to deposit (e.g. 10)
 * @param {Function} onStatus       - callback for status updates: { step, message }
 * @returns {Promise<{ ok, credited, txHash, error }>}
 */
export async function depositSupra(walletAddress, amountSupra, onStatus = () => {}) {
  try {
    // Step 1 — create fingerprinted intent on backend
    onStatus({ step: "intent", message: "Creating deposit intent..." });
    const intentRes = await apiCreateIntent(amountSupra);
    if (!intentRes.ok) {
      return { ok: false, error: intentRes.error || "Failed to create deposit intent" };
    }
    const intent = intentRes.intent;

    // Step 2 — send transaction via StarKey
    onStatus({ step: "sending", message: `Confirm ${intent.encodedAmount} SUPRA in StarKey...` });
    const txHash = await sendSupraTransfer(walletAddress, intent.depositAddress, intent.encodedAmount);

    // Step 3 — confirm with backend
    onStatus({ step: "confirming", message: "Verifying transaction..." });
    const confirmRes = await apiConfirmDeposit(intent.id, txHash);
    if (!confirmRes.ok) {
      return { ok: false, error: confirmRes.error || "Backend could not confirm transaction", txHash };
    }

    onStatus({ step: "done", message: `✓ ${intent.requestedAmount} SUPRA credited` });
    return { ok: true, credited: intent.requestedAmount, txHash };

  } catch (err) {
    // User rejected the tx in StarKey — common, not an error we should log loudly
    const userRejected =
      err.message?.includes("rejected") ||
      err.message?.includes("cancel") ||
      err.message?.includes("denied") ||
      err.code === 4001;

    return {
      ok: false,
      error: userRejected ? "Transaction cancelled" : (err.message || "Unknown error"),
    };
  }
}

export { getProvider };
