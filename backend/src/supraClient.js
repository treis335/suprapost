const axios = require("axios");

const RPC_BASE = process.env.SUPRA_RPC_URL || "https://rpc-mainnet.supra.com";
const OCTAS_PER_SUPRA = 1e8;

async function getBalance(address) {
  const clean = address.startsWith("0x") ? address.slice(2) : address;

  // Endpoint de recursos — mais fiável
  const coinType = "0x1::coin::CoinStore<0x1::supra_coin::SupraCoin>";
  const url = `${RPC_BASE}/rpc/v1/accounts/${clean}/resources/${encodeURIComponent(coinType)}`;

  try {
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;
    const octas =
      Number(data?.result?.data?.coin?.value) ||
      Number(data?.result?.[0]?.data?.coin?.value) ||
      Number(data?.result?.[0]?.coin?.value) ||
      Number(data?.data?.coin?.value) ||
      0;
    return +(octas / OCTAS_PER_SUPRA).toFixed(8);
  } catch (err) {
    if (err.response?.status === 404) return 0;
    throw err;
  }
}

async function getAccountTransactions(address, { count = 25 } = {}) {
  const clean = address.startsWith("0x") ? address.slice(2) : address;
  const url = `${RPC_BASE}/rpc/v1/accounts/${clean}/transactions`;
  const res = await axios.get(url, { params: { count }, timeout: 15000 });
  return res.data;
}

async function getTransaction(txHash) {
  const clean = txHash.startsWith("0x") ? txHash.slice(2) : txHash;
  const url = `${RPC_BASE}/rpc/v1/transactions/${clean}`;
  const res = await axios.get(url, { timeout: 15000 });
  return res.data?.record || res.data;
}

/**
 * Extrai info de transferência de uma transação Supra.
 * Suporta múltiplos formatos de payload que a chain usa.
 */
function extractTransferInfo(tx) {
  try {
    if (!tx) return null;

    // Formato 1: payload.Move (formato mainnet confirmado Jun 2026)
    const move = tx?.payload?.Move;
    if (move) {
      const fn = move.function || move.function_id || "";
      const isTransfer =
        fn.includes("supra_account::transfer_coins") ||
        fn.includes("supra_account::transfer") ||
        fn.includes("coin::transfer");
      if (isTransfer) {
        const args = move.arguments || move.args || [];
        const recipient = args[0];
        const rawAmount = args[1];
        if (rawAmount != null) {
          return {
            hash: tx.hash,
            sender: tx.header?.sender || tx.sender,
            recipient,
            amountOctas: BigInt(rawAmount),
          };
        }
      }
    }

    // Formato 2: payload directo (algumas versões da API)
    const payload = tx?.payload;
    if (payload && typeof payload === "object") {
      const fn = payload.function || payload.function_id || "";
      const isTransfer =
        fn.includes("supra_account::transfer_coins") ||
        fn.includes("supra_account::transfer");
      if (isTransfer) {
        const args = payload.arguments || payload.args || [];
        const recipient = args[0];
        const rawAmount = args[1];
        if (rawAmount != null) {
          return {
            hash: tx.hash,
            sender: tx.sender,
            recipient,
            amountOctas: BigInt(rawAmount),
          };
        }
      }
    }

    // Formato 3: events (fallback — procura evento Deposit)
    const events = tx?.events || tx?.output?.Move?.events || [];
    for (const ev of events) {
      const type = ev?.type || "";
      if (type.includes("coin::DepositEvent") || type.includes("fungible_asset::Deposit")) {
        const amount = ev?.data?.amount || ev?.data?.value;
        const recipient = ev?.data?.account || tx?.header?.sender;
        if (amount) {
          return {
            hash: tx.hash,
            sender: tx.header?.sender || tx.sender,
            recipient,
            amountOctas: BigInt(amount),
          };
        }
      }
    }

    return null;
  } catch (e) {
    console.error("[supraClient] extractTransferInfo error:", e.message, JSON.stringify(tx).slice(0, 200));
    return null;
  }
}

module.exports = {
  getAccountTransactions,
  getBalance,
  getTransaction,
  extractTransferInfo,
  OCTAS_PER_SUPRA,
};
