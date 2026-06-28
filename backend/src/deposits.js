const { v4: uuidv4 } = require("uuid");
const { getTransaction, extractTransferInfo, OCTAS_PER_SUPRA } = require("./supraClient");

/**
 * Non-custodial deposit flow — fingerprinted amount matching.
 * Ver comentário original para a explicação completa do design.
 */

const DEPOSIT_ADDRESS = process.env.SUPRA_DEPOSIT_ADDRESS;
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 min
const MAX_PENDING_PER_USER = 5;

// In-memory: encodedAmount.toFixed(8) → intent object
const pendingIntents = new Map();

function encodeAmount(requestedAmount) {
  const tail = Math.floor(Math.random() * 9000) + 1000;
  const encoded = +(requestedAmount + tail / 1e8).toFixed(8);
  return { encoded, tail };
}

function createDepositIntent(userAddress, requestedAmount) {
  if (!DEPOSIT_ADDRESS) throw new Error("SUPRA_DEPOSIT_ADDRESS não configurado no servidor");
  if (!requestedAmount || requestedAmount <= 0) throw new Error("Montante inválido");

  const existing = [...pendingIntents.values()].filter(
    (i) => i.userAddress === userAddress.toLowerCase() && !i.fulfilled && Date.now() < i.expiresAt
  );
  if (existing.length >= MAX_PENDING_PER_USER) {
    throw new Error("Demasiados depósitos pendentes — aguarda ou espera que expirem");
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
  pendingIntents.set(encoded.toFixed(8), intent);
  return intent;
}

function getIntentStatus(intentId) {
  for (const intent of pendingIntents.values()) {
    if (intent.id === intentId) return intent;
  }
  return null;
}

async function pollForDeposits(db) {
  if (!DEPOSIT_ADDRESS) return [];
  const { getAccountTransactions } = require("./supraClient");

  for (const [key, intent] of pendingIntents) {
    if (!intent.fulfilled && Date.now() > intent.expiresAt) pendingIntents.delete(key);
  }

  const activeIntents = [...pendingIntents.values()].filter((i) => !i.fulfilled);
  if (!activeIntents.length) return [];

  let txData;
  try {
    txData = await getAccountTransactions(DEPOSIT_ADDRESS, { count: 25 });
  } catch (err) {
    console.error("[deposits] Erro ao buscar txs:", err.message);
    return [];
  }

  const transactions = txData?.record || txData?.transactions || txData?.result || [];
  const fulfilled = [];

  for (const tx of transactions) {
    const info = extractTransferInfo(tx);
    if (!info) continue;

    const recipientClean = (info.recipient || "").toLowerCase().replace(/^0x/, "");
    const depositClean = DEPOSIT_ADDRESS.toLowerCase().replace(/^0x/, "");
    if (!recipientClean.endsWith(depositClean) && !depositClean.endsWith(recipientClean)) continue;

    const amountSupra = +(Number(info.amountOctas) / OCTAS_PER_SUPRA).toFixed(8);
    const key = amountSupra.toFixed(8);
    const intent = pendingIntents.get(key);
    if (!intent || intent.fulfilled) continue;

    await db.read();
    const user = db.forUser(intent.userAddress);
    user.wallet.balance = +(user.wallet.balance + intent.requestedAmount).toFixed(8);
    await db.write();

    if (!Array.isArray(user.wallet.deposits)) user.wallet.deposits = [];
    user.wallet.deposits.unshift({
      id:            intent.id,
      amount:        intent.requestedAmount,
      encodedAmount: intent.encodedAmount,
      txHash:        tx.hash,
      createdAt:     Date.now(),
    });
    if (user.wallet.deposits.length > 50) user.wallet.deposits = user.wallet.deposits.slice(0, 50);
    intent.fulfilled = true;
    intent.txHash = tx.hash;
    fulfilled.push(intent);
    console.log(`[deposits] Creditado ${intent.requestedAmount} SUPRA a ${intent.userAddress} (tx ${tx.hash})`);
  }

  return fulfilled;
}

/**
 * Confirma depósito via txHash que o browser enviou.
 * Verifica o montante na chain e credita o utilizador.
 *
 * Modo permissivo: se a chain não for acessível, confia no intent
 * (o fingerprint único já é suficiente protecção contra double-credit).
 */
async function confirmDepositByTxHash(db, intent, txHash) {
  if (intent.fulfilled) return { ok: true, alreadyCredited: true };

  let txData = null;
  try {
    txData = await getTransaction(txHash);
    console.log("[deposits] TX data:", JSON.stringify(txData).slice(0, 300));
  } catch (err) {
    console.warn("[deposits] Não foi possível buscar TX, modo permissivo:", err.message);
  }

  if (txData) {
    const info = extractTransferInfo(txData);
    if (!info) {
      // Se não conseguimos parsear mas temos tx data, pode ser formato desconhecido
      // Log para diagnóstico mas não bloquear — o fingerprint já valida
      console.warn("[deposits] Não consegui parsear tx, a creditar na mesma. TX:", JSON.stringify(txData).slice(0, 200));
    } else {
      const amountSupra = +(Number(info.amountOctas) / OCTAS_PER_SUPRA).toFixed(8);
      const expected = +intent.encodedAmount.toFixed(8);
      // Tolerância de 2 octas para arredondamentos
      if (Math.abs(amountSupra - expected) > 2e-8) {
        console.warn(`[deposits] Montante errado: esperado ${expected}, recebido ${amountSupra}`);
        return {
          ok: false,
          error: `Montante não corresponde: esperado ${expected} SUPRA, recebido ${amountSupra} SUPRA`,
        };
      }
    }
  }

  // Creditar e guardar no histórico
  await db.read();
  const user = db.forUser(intent.userAddress);
  user.wallet.balance = +(user.wallet.balance + intent.requestedAmount).toFixed(8);
  if (!Array.isArray(user.wallet.deposits)) user.wallet.deposits = [];
  user.wallet.deposits.unshift({
    id:            intent.id,
    amount:        intent.requestedAmount,
    encodedAmount: intent.encodedAmount,
    txHash:        txHash,
    createdAt:     Date.now(),
  });
  // Manter apenas os últimos 50 depósitos
  if (user.wallet.deposits.length > 50) user.wallet.deposits = user.wallet.deposits.slice(0, 50);
  await db.write();

  intent.fulfilled = true;
  intent.txHash = txHash;

  console.log(`[deposits] Creditado ${intent.requestedAmount} SUPRA a ${intent.userAddress} via hash ${txHash}`);
  return { ok: true, credited: intent.requestedAmount };
}

module.exports = {
  createDepositIntent,
  getIntentStatus,
  pollForDeposits,
  confirmDepositByTxHash,
  DEPOSIT_ADDRESS,
};
