/**
 * SupraPost Payment Module
 *
 * Envia SUPRA usando a StarKey wallet.
 * Testado contra a API real da StarKey (Jun 2026).
 *
 * StarKey exposes window.starkey.supra with the methods:
 *   - connect()                    → returns array of addresses
 *   - account()                    → current address
 *   - sendTransaction(txObject)    → retorna txHash string
 *   - signMessage(Uint8Array)      → { signature, publicKey }
 *
 * The correct sendTransaction format for a SUPRA transfer is:
 *   { data: <hex string do payload BCS serializado>  }
 * OR the simplified format used by some versions:
 *   { from, to, value (em octas como string) }
 */

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

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
  const res = await fetch(`${apiBase}/api/wallet/deposit/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ amount: amountSupra }),
  });
  return res.json();
}

async function apiConfirmDeposit(intentId, txHash) {
  const res = await fetch(`${apiBase}/api/wallet/deposit/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ intentId, txHash }),
  });
  return res.json();
}

/**
 * Envia SUPRA via StarKey.
 *
 * Tries 3 formats in order of likelihood of success,
 * logging which one worked for diagnostics.
 */
async function sendSupraTransfer(fromAddress, toAddress, amountSupra) {
  const provider = getProvider();
  if (!provider) throw new Error("StarKey not detected — install it from starkey.app");

  const amountOctas = Math.round(amountSupra * OCTAS_PER_SUPRA);
  const amountOctasStr = amountOctas.toString();

  console.log("[payment] StarKey provider keys:", Object.keys(provider));
  console.log("[payment] Sending:", {
    from: fromAddress,
    to: toAddress,
    supra: amountSupra,
    octas: amountOctas,
  });

  // ── Format 1: transferCoin (high-level API — more reliable) ──────────────
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
      console.warn("[payment] transferCoin failed:", e.message);
    }
  }

  // ── Formato 2: sendTransaction com objeto simples ──────────────────────────
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
      console.warn("[payment] sendTransaction 2a failed:", e.message);
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

        const rawPayload = [
          sender,
          0,
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
        console.warn("[payment] sendTransaction 2b failed:", e.message);
      }
    }

    // Format 2c: Move payload in readable JSON format
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
      console.warn("[payment] sendTransaction 2c failed:", e.message);
    }
  }

  throw new Error(
    "Could not send the transaction via StarKey. " +
    "Verifica a consola do browser para detalhes. " +
    "Make sure StarKey is up to date and has enough SUPRA."
  );
}

/**
 * Fluxo completo: intent → StarKey tx → backend confirma e credita.
 */
export async function depositSupra(walletAddress, amountSupra, onStatus = () => {}) {
  try {
    // 1. Criar intent no backend
    onStatus({ step: "intent", message: "Creating deposit..." });
    const intentRes = await apiCreateIntent(amountSupra);
    if (!intentRes.ok) {
      return { ok: false, error: intentRes.error || "Error creating deposit" };
    }
    const intent = intentRes.intent;
    console.log("[payment] Intent criado:", intent);

    // 2. Send TX via StarKey
    onStatus({
      step: "sending",
      message: `Confirm ${intent.encodedAmount} SUPRA na StarKey...`,
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
          ? "Transaction cancelled in StarKey"
          : `StarKey: ${err.message}`,
      };
    }

    // 3. Confirm no backend
    onStatus({ step: "confirming", message: "Verifying transaction on chain..." });
    const confirmRes = await apiConfirmDeposit(intent.id, txHash);
    if (!confirmRes.ok) {
      return {
        ok: false,
        error: confirmRes.error || "Backend could not confirm",
        txHash,
        retryable: true,
      };
    }

    onStatus({ step: "done", message: `✓ ${intent.requestedAmount} SUPRA creditados` });
    return { ok: true, credited: intent.requestedAmount, txHash };

  } catch (err) {
    console.error("[payment] depositSupra general error:", err);
    return {
      ok: false,
      error: err.message || "Unknown error",
    };
  }
}

export { getProvider, sendSupraTransfer };