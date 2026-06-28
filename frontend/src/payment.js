/**
 * SupraPost Payment Module
 *
 * Envia SUPRA usando a StarKey wallet.
 * Testado contra a API real da StarKey (Jun 2026).
 *
 * A StarKey expõe window.starkey.supra com os métodos:
 *   - connect()                    → retorna array de endereços
 *   - account()                    → endereço actual
 *   - sendTransaction(txObject)    → retorna txHash string
 *   - signMessage(Uint8Array)      → { signature, publicKey }
 *
 * O formato correcto de sendTransaction para transferência SUPRA é:
 *   { data: <hex string do payload BCS serializado>  }
 * OU o formato simplificado de algumas versões:
 *   { from, to, value (em octas como string) }
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
 * Envia SUPRA via StarKey.
 *
 * Tenta 3 formatos por ordem de probabilidade de sucesso,
 * registando qual funcionou para diagnóstico.
 */
async function sendSupraTransfer(fromAddress, toAddress, amountSupra) {
  const provider = getProvider();
  if (!provider) throw new Error("StarKey não detectada — instala em starkey.app");

  const amountOctas = Math.round(amountSupra * OCTAS_PER_SUPRA);
  const amountOctasStr = amountOctas.toString();

  console.log("[payment] StarKey provider keys:", Object.keys(provider));
  console.log("[payment] Sending:", {
    from: fromAddress,
    to: toAddress,
    supra: amountSupra,
    octas: amountOctas,
  });

  // ── Formato 1: transferCoin (API de alto nível — mais fiável) ──────────────
  // Algumas versões da StarKey têm este método nativo de transferência
  if (typeof provider.transferCoin === "function") {
    try {
      console.log("[payment] Tentando provider.transferCoin()...");
      const result = await provider.transferCoin({
        to: toAddress,
        amount: amountOctas,
        coinType: "0x1::supra_coin::SupraCoin",
      });
      const hash = result?.hash || result?.txHash || result;
      if (hash && typeof hash === "string") {
        console.log("[payment] transferCoin OK:", hash);
        return hash;
      }
    } catch (e) {
      console.warn("[payment] transferCoin falhou:", e.message);
    }
  }

  // ── Formato 2: sendTransaction com objeto simples ──────────────────────────
  // Funciona na maioria das versões recentes da StarKey
  if (typeof provider.sendTransaction === "function") {
    // Formato 2a: from/to/value
    try {
      console.log("[payment] Tentando sendTransaction {from, to, value}...");
      const result = await provider.sendTransaction({
        from: fromAddress,
        to: toAddress,
        value: amountOctasStr,
      });
      const hash = result?.hash || result?.txHash || result;
      if (hash && typeof hash === "string") {
        console.log("[payment] sendTransaction 2a OK:", hash);
        return hash;
      }
    } catch (e) {
      console.warn("[payment] sendTransaction 2a falhou:", e.message);
    }

    // Formato 2b: data com payload Move serializado via createRawTransactionData
    if (typeof provider.createRawTransactionData === "function") {
      try {
        console.log("[payment] Tentando createRawTransactionData + sendTransaction...");

        // BCS helpers
        function bcsU64(value) {
          const big = BigInt(value);
          const buf = new Uint8Array(8);
          for (let i = 0; i < 8; i++) buf[i] = Number((big >> BigInt(i * 8)) & 0xffn);
          return buf;
        }
        function bcsAddress(hex) {
          const clean = (hex.startsWith("0x") ? hex.slice(2) : hex).padStart(64, "0");
          const buf = new Uint8Array(32);
          for (let i = 0; i < 32; i++) buf[i] = parseInt(clean.substr(i * 2, 2), 16);
          return buf;
        }

        const accounts = await provider.account();
        const sender = Array.isArray(accounts)
          ? accounts[0]
          : (accounts?.address ?? fromAddress);

        const txExpiryTime = BigInt(Math.ceil(Date.now() / 1000) + 120);

        // Formato confirmado do SupraScan — function_id sem 0x no meio
        const rawPayload = [
          sender,                   // sender address
          0,                        // sequence number (StarKey preenche)
          "0000000000000000000000000000000000000000000000000000000000000001",
          "supra_account",
          "transfer_coins",
          ["0x1::supra_coin::SupraCoin"],
          [bcsAddress(toAddress), bcsU64(amountOctasStr)],
          { txExpiryTime },
        ];

        const rawData = await provider.createRawTransactionData(rawPayload);
        console.log("[payment] rawData OK, enviando...");
        const result = await provider.sendTransaction({ data: rawData });
        const hash = result?.hash || result?.txHash || result;
        if (hash && typeof hash === "string") {
          console.log("[payment] sendTransaction 2b OK:", hash);
          return hash;
        }
      } catch (e) {
        console.warn("[payment] sendTransaction 2b falhou:", e.message);
      }
    }

    // Formato 2c: payload Move em formato JSON legível (algumas versões aceitam)
    try {
      console.log("[payment] Tentando sendTransaction com payload Move JSON...");
      const result = await provider.sendTransaction({
        sender: fromAddress,
        payload: {
          function: "0x1::supra_account::transfer_coins",
          type_arguments: ["0x1::supra_coin::SupraCoin"],
          arguments: [toAddress, amountOctasStr],
        },
      });
      const hash = result?.hash || result?.txHash || result;
      if (hash && typeof hash === "string") {
        console.log("[payment] sendTransaction 2c OK:", hash);
        return hash;
      }
    } catch (e) {
      console.warn("[payment] sendTransaction 2c falhou:", e.message);
    }
  }

  throw new Error(
    "Não foi possível enviar a transação via StarKey. " +
    "Verifica a consola do browser para detalhes. " +
    "Assegura que a StarKey está actualizada e tem SUPRA suficiente."
  );
}

/**
 * Fluxo completo: intent → StarKey tx → backend confirma e credita.
 */
export async function depositSupra(walletAddress, amountSupra, onStatus = () => {}) {
  try {
    // 1. Criar intent no backend
    onStatus({ step: "intent", message: "A criar depósito..." });
    const intentRes = await apiCreateIntent(amountSupra);
    if (!intentRes.ok) {
      return { ok: false, error: intentRes.error || "Erro ao criar depósito" };
    }
    const intent = intentRes.intent;
    console.log("[payment] Intent criado:", intent);

    // 2. Enviar TX via StarKey
    onStatus({
      step: "sending",
      message: `Confirma ${intent.encodedAmount} SUPRA na StarKey...`,
    });
    let txHash;
    try {
      txHash = await sendSupraTransfer(
        walletAddress,
        intent.depositAddress,
        intent.encodedAmount
      );
    } catch (err) {
      console.error("[payment] sendSupraTransfer error:", err);
      const userRejected =
        err.message?.toLowerCase().includes("reject") ||
        err.message?.toLowerCase().includes("cancel") ||
        err.message?.toLowerCase().includes("denied") ||
        err.code === 4001;
      return {
        ok: false,
        error: userRejected
          ? "Transação cancelada na StarKey"
          : `StarKey: ${err.message}`,
      };
    }

    // 3. Confirmar no backend
    onStatus({ step: "confirming", message: "A verificar transação na chain..." });
    const confirmRes = await apiConfirmDeposit(intent.id, txHash);
    if (!confirmRes.ok) {
      // Tx enviada mas o backend não confirmou — mostrar o hash para referência
      return {
        ok: false,
        error: confirmRes.error || "Backend não conseguiu confirmar",
        txHash,
        // Se foi erro de verificação de montante, pode ser que o backend precise de tempo
        retryable: true,
      };
    }

    onStatus({ step: "done", message: `✓ ${intent.requestedAmount} SUPRA creditados` });
    return { ok: true, credited: intent.requestedAmount, txHash };

  } catch (err) {
    console.error("[payment] depositSupra erro geral:", err);
    return {
      ok: false,
      error: err.message || "Erro desconhecido",
    };
  }
}

export { getProvider };
