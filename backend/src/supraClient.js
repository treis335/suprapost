const axios = require("axios");

/**
 * Minimal read-only client for the Supra RPC node — just enough to detect
 * incoming SUPRA payments to our deposit address. No private keys live
 * here; this module never signs or sends transactions, only reads public
 * chain data.
 *
 * Docs: https://docs.supra.com/network/move/rest-api/testnet/accounts
 *       https://docs.supra.com/network/move/rest-api/testnet/transactions
 */
const RPC_BASE = process.env.SUPRA_RPC_URL || "https://rpc-testnet.supra.com";
const SUPRA_COIN_TYPE = "0x1::coin::CoinStore<0x1::supra_coin::SupraCoin>";
const OCTAS_PER_SUPRA = 1e8; // SUPRA, like most Move coins, uses 8 decimal places internally

/**
 * Fetches the most recent finalized transactions sent to/from an address.
 * Returns the raw API response — shape may need adjusting once tested
 * against a live testnet account (see NOTE below).
 */
async function getAccountTransactions(address, { count = 25 } = {}) {
  const clean = address.startsWith("0x") ? address.slice(2) : address;
  const url = `${RPC_BASE}/rpc/v3/accounts/${clean}/transactions`;
  const res = await axios.get(url, { params: { count }, timeout: 15000 });
  return res.data;
}

/**
 * Reads the SUPRA coin balance of an address, in whole SUPRA (not octas).
 */
async function getBalance(address) {
  const clean = address.startsWith("0x") ? address.slice(2) : address;
  const url = `${RPC_BASE}/rpc/v1/accounts/${clean}/resources/${encodeURIComponent(SUPRA_COIN_TYPE)}`;
  const res = await axios.get(url, { timeout: 15000 });
  const octas = Number(res.data?.result?.[0]?.coin?.value ?? 0);
  return octas / OCTAS_PER_SUPRA;
}

/**
 * NOTE — this is the part most likely to need adjustment once tested
 * against real testnet transactions: the exact shape of each transaction
 * record (where the transfer amount and sender address live inside
 * `payload`/`output`) isn't fully nailed down from docs alone. Treat
 * `extractTransferInfo` as a best-effort parser to refine once you can
 * inspect a handful of real responses (e.g. via SupraScan or by triggering
 * a test transfer on testnet and logging the raw transaction object).
 */
function extractTransferInfo(tx) {
  try {
    const payload = tx?.payload?.Move?.EntryFunction || tx?.payload?.EntryFunction;
    const isCoinTransfer =
      payload?.module?.name === "supra_account" && payload?.function === "transfer";
    if (!isCoinTransfer) return null;

    // args are typically [recipient_address_bytes, amount_bytes] BCS-encoded;
    // depending on RPC version this may already arrive decoded. Adjust the
    // decode logic here once you've inspected a real payload.
    return {
      hash: tx.hash,
      sender: tx.header?.sender,
      raw: tx, // keep the raw record around for manual inspection/logging
    };
  } catch {
    return null;
  }
}

module.exports = { getAccountTransactions, getBalance, extractTransferInfo, OCTAS_PER_SUPRA };
