const axios = require("axios");

/**
 * Minimal read-only Supra RPC client.
 * Never signs or sends transactions — only reads public chain data.
 * Docs: https://docs.supra.com/network/move/rest-api
 */

const RPC_BASE = process.env.SUPRA_RPC_URL || "https://rpc-mainnet.supra.com";
const OCTAS_PER_SUPRA = 1e8; // 8 decimal places — 1 SUPRA = 100,000,000 octas

/**
 * Returns the SUPRA coin balance of an address in whole SUPRA (8 decimal places).
 * Rounds to 8 dp to match on-chain precision.
 */
async function getBalance(address) {
  const clean = address.startsWith("0x") ? address.slice(2) : address;

  // Try the specific resource endpoint first (faster)
  const coinType = "0x1::coin::CoinStore<0x1::supra_coin::SupraCoin>";
  const url = `${RPC_BASE}/rpc/v1/accounts/${clean}/resources/${encodeURIComponent(coinType)}`;

  try {
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;

    // The Supra REST API wraps the resource under result.data or result[0].data
    // Try all known shapes defensively.
    const octas =
      Number(data?.result?.data?.coin?.value) ||         // shape A: { result: { data: { coin: { value } } } }
      Number(data?.result?.[0]?.data?.coin?.value) ||    // shape B: { result: [{ data: { coin: { value } } }] }
      Number(data?.result?.[0]?.coin?.value) ||          // shape C: { result: [{ coin: { value } }] }
      Number(data?.data?.coin?.value) ||                 // shape D: { data: { coin: { value } } }
      0;

    return +(octas / OCTAS_PER_SUPRA).toFixed(8);
  } catch (err) {
    // 404 means the account has no SUPRA CoinStore (new account, zero balance)
    if (err.response?.status === 404) return 0;
    throw err;
  }
}

/**
 * Fetches the most recent transactions for an address.
 */
async function getAccountTransactions(address, { count = 25 } = {}) {
  const clean = address.startsWith("0x") ? address.slice(2) : address;
  const url = `${RPC_BASE}/rpc/v1/accounts/${clean}/transactions`;
  const res = await axios.get(url, { params: { count }, timeout: 15000 });
  return res.data;
}

/**
 * Extracts the transferred amount (in octas) from a real Supra transaction.
 *
 * Confirmed against mainnet transaction format (Jun 2026):
 *   payload.Move.function  = "0x1::supra_account::transfer_coins"
 *   payload.Move.arguments = ["<recipient_address>", "<amount_in_octas>"]
 *
 * The amount also appears in output.Move.events as fungible_asset::Deposit
 * but reading from arguments is simpler and equally reliable.
 */
function extractTransferInfo(tx) {
  try {
    const move = tx?.payload?.Move;
    if (!move) return null;

    // Match the confirmed function name from mainnet
    const fn = move.function || "";
    const isTransfer =
      fn === "0x1::supra_account::transfer_coins" ||
      fn === "0x1::supra_account::transfer";
    if (!isTransfer) return null;

    // arguments[0] = recipient address, arguments[1] = amount in octas
    const args = move.arguments || [];
    const recipient = args[0];
    const amountOctas = args[1] != null ? BigInt(args[1]) : null;
    if (amountOctas === null) return null;

    return {
      hash: tx.hash,
      sender: tx.header?.sender,
      recipient,
      amountOctas,
    };
  } catch {
    return null;
  }
}

module.exports = { getAccountTransactions, getBalance, extractTransferInfo, OCTAS_PER_SUPRA };
