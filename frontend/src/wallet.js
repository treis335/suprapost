/**
 * StarKey / Supra wallet connection + sign-in-with-wallet auth flow.
 *
 * StarKey injects `window.starkey.supra` into the page when its browser
 * extension is installed. This module wraps that provider to:
 *   1. detect installation
 *   2. connect and get the user's address
 *   3. run the challenge/sign/verify dance against our own backend to
 *      get a session JWT (see backend/src/auth.js)
 *
 * NOTE: the exact shape of supraProvider.signMessage()'s return value can
 * vary by StarKey SDK version. This code assumes it resolves to (or can be
 * normalized into) { signature, publicKey } as hex strings — confirm this
 * against your installed StarKey version and adjust normalizeSignResult()
 * below if needed.
 */

const SESSION_KEY = "suprapost_session"; // sessionStorage key — token + address

function getProvider() {
  return typeof window !== "undefined" ? window?.starkey?.supra : undefined;
}

function isStarKeyInstalled() {
  return !!getProvider();
}

/**
 * Polls for the injected starkey object for a few seconds — the extension
 * injects asynchronously and may not be present on the very first render.
 */
function waitForStarKey(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (isStarKeyInstalled()) return resolve(true);
    const start = Date.now();
    const interval = setInterval(() => {
      if (isStarKeyInstalled()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 250);
  });
}

async function connectWallet() {
  const provider = getProvider();
  if (!provider) throw new Error("StarKey wallet not detected. Install it from starkey.app");
  // connect() prompts the extension popup and returns connected account(s)
  const accounts = await provider.connect();
  const address = Array.isArray(accounts) ? accounts[0] : accounts?.address || accounts;
  if (!address) throw new Error("No account returned from wallet");
  return address;
}

function normalizeSignResult(raw) {
  // StarKey's signMessage response shape can differ; this defensively
  // extracts { signature, publicKey } from the most likely shapes.
  if (raw?.signature && raw?.publicKey) return raw;
  if (raw?.signature && raw?.public_key) return { signature: raw.signature, publicKey: raw.public_key };
  if (typeof raw === "string") {
    // last resort: some providers just return the raw signature hex and
    // expect the caller to already know the public key from connect()
    return { signature: raw, publicKey: null };
  }
  throw new Error("Unrecognized signMessage() response shape from wallet — check StarKey SDK version");
}

async function signMessage(message) {
  const provider = getProvider();
  if (!provider) throw new Error("StarKey wallet not detected");
  const raw = await provider.signMessage(message);
  return normalizeSignResult(raw);
}

/**
 * Full sign-in flow: connect wallet -> request nonce from backend -> sign
 * it -> verify with backend -> store session token.
 * Returns { address, token }.
 */
async function signInWithWallet() {
  const address = await connectWallet();

  const nonceRes = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const { message } = await nonceRes.json();

  const { signature, publicKey } = await signMessage(message);

  const verifyRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature: JSON.stringify({ signature, publicKey }) }),
  });
  const result = await verifyRes.json();
  if (!result.ok) throw new Error(result.error || "Sign-in failed");

  const session = { address: result.address, token: result.token };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export { isStarKeyInstalled, waitForStarKey, signInWithWallet, getSession, clearSession, shortAddress };
