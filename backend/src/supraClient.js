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
 * Best-effort parser for a transfer transaction payload.
 * Adjust path once inspected against real testnet transactions.
 */
function extractTransferInfo(tx) {
  try {
    const payload = tx?.payload?.Move?.EntryFunction || tx?.payload?.EntryFunction;
    const isTransfer =
      payload?.module?.name === "supra_account" && payload?.function === "transfer";
    if (!isTransfer) return null;
    return { hash: tx.hash, sender: tx.header?.sender, raw: tx };
  } catch {
    return null;
  }
}

module.exports = { getAccountTransactions, getBalance, extractTransferInfo, OCTAS_PER_SUPRA };
