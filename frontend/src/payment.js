/**
 * SupraPost Payment Module
 *
 * Usa a StarKey para enviar SUPRA diretamente do browser.
 * Confirmado contra transação real mainnet (Jun 2026):
 *   function: "0x1::supra_account::transfer_coins"
 *   arguments: [recipient_address_string, amount_octas_string]
 */

const OCTAS_PER_SUPRA = 1e8;

function getProvider() {
  return window?.starkey?.supra ?? null;
}

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

/**
 * Envia SUPRA usando a StarKey.
 * Testa múltiplos formatos — o que funcionar é o correto para a versão instalada.
 */
async function sendSupraTransfer(fromAddress, toAddress, amountSupra) {
  const provider = getProvider();
  if (!provider) throw new Error("StarKey não detectada — instala em starkey.app");

  const amountOctas = Math.round(amountSupra * OCTAS_PER_SUPRA).toString();
  console.log("[payment] provider methods:", Object.keys(provider));
  console.log("[payment] sending:", { from: fromAddress, to: toAddress, octas: amountOctas });

  // Formato A — transfer_coins com strings (igual à transação real do SupraScan)
  // Esta é a forma que a StarKey usa internamente quando envias pelo UI
  try {
    const accounts = await provider.account();
    const sender = Array.isArray(accounts) ? accounts[0] : accounts?.address ?? fromAddress;

    const txExpiryTime = BigInt(Math.ceil(Date.now() / 1000) + 120);

    // BCS serialize u64 (little-endian 8 bytes)
    function bcsU64(value) {
      const big = BigInt(value);
      const buf = new Uint8Array(8);
      for (let i = 0; i < 8; i++) buf[i] = Number((big >> BigInt(i * 8)) & 0xffn);
      return buf;
    }

    // BCS serialize address (32 bytes from hex)
    function bcsAddress(hex) {
      const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
      const padded = clean.padStart(64, "0");
      const buf = new Uint8Array(32);
      for (let i = 0; i < 32; i++) buf[i] = parseInt(padded.substr(i * 2, 2), 16);
      return buf;
    }

    const rawPayload = [
      sender,
      0,
      "0000000000000000000000000000000000000000000000000000000000000001",
      "supra_account",
      "transfer_coins",
      ["0x1::supra_coin::SupraCoin"],
      [bcsAddress(toAddress), bcsU64(amountOctas)],
      { txExpiryTime },
    ];

    console.log("[payment] trying createRawTransactionData...");
    const rawData = await provider.createRawTransactionData(rawPayload);
    console.log("[payment] rawData received:", !!rawData);

    const txHash = await provider.sendTransaction({ data: rawData });
    console.log("[payment] txHash:", txHash);
    return txHash;

  } catch (errA) {
    console.warn("[payment] format A failed:", errA.message);

    // Formato B — fallback: starkey sendTransaction direto sem createRawTransactionData
    // Algumas versões da StarKey aceitam este formato mais simples
    try {
      console.log("[payment] trying direct sendTransaction format B...");
      const txHash = await provider.sendTransaction({
        from: fromAddress,
        to: toAddress,
        value: amountOctas,
        data: null,
      });
      console.log("[payment] format B txHash:", txHash);
      return txHash;
    } catch (errB) {
      console.warn("[payment] format B failed:", errB.message);
      // Re-throw the original error (format A) as it's more informative
      throw errA;
    }
  }
}

/**
 * Fluxo completo: intent → StarKey tx → backend confirma e credita.
 */
export async function depositSupra(walletAddress, amountSupra, onStatus = () => {}) {
  try {
    onStatus({ step: "intent", message: "A criar depósito..." });
    const intentRes = await apiCreateIntent(amountSupra);
    if (!intentRes.ok) {
      return { ok: false, error: intentRes.error || "Erro ao criar depósito" };
    }
    const intent = intentRes.intent;
    console.log("[payment] intent created:", intent);

    onStatus({ step: "sending", message: `Confirma ${intent.encodedAmount} SUPRA na StarKey...` });
    const txHash = await sendSupraTransfer(walletAddress, intent.depositAddress, intent.encodedAmount);

    onStatus({ step: "confirming", message: "A verificar transação..." });
    const confirmRes = await apiConfirmDeposit(intent.id, txHash);
    if (!confirmRes.ok) {
      return { ok: false, error: confirmRes.error || "Backend não conseguiu confirmar", txHash };
    }

    onStatus({ step: "done", message: `✓ ${intent.requestedAmount} SUPRA creditados` });
    return { ok: true, credited: intent.requestedAmount, txHash };

  } catch (err) {
    console.error("[payment] depositSupra error:", err);
    const userRejected =
      err.message?.toLowerCase().includes("reject") ||
      err.message?.toLowerCase().includes("cancel") ||
      err.message?.toLowerCase().includes("denied") ||
      err.code === 4001;

    return {
      ok: false,
      error: userRejected ? "Transação cancelada" : (err.message || "Erro desconhecido"),
    };
  }
}

export { getProvider };
