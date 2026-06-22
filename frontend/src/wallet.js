/**
 * StarKey / Supra wallet connection + sign-in flow.
 *
 * StarKey injects window.starkey.supra into the page.
 * signMessage() in StarKey expects a Uint8Array and returns
 * { signature: Uint8Array, publicKey: Uint8Array }.
 */

const SESSION_KEY = "suprapost_session";

function getProvider() {
  return typeof window !== "undefined" ? window?.starkey?.supra : undefined;
}

export function isStarKeyInstalled() {
  return !!getProvider();
}

export function waitForStarKey(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (isStarKeyInstalled()) return resolve(true);
    const start = Date.now();
    const id = setInterval(() => {
      if (isStarKeyInstalled()) { clearInterval(id); resolve(true); }
      else if (Date.now() - start > timeoutMs) { clearInterval(id); resolve(false); }
    }, 250);
  });
}

async function connectWallet() {
  const p = getProvider();
  if (!p) throw new Error("StarKey not detected — install it from starkey.app");
  const accounts = await p.connect();
  const address = Array.isArray(accounts) ? accounts[0]
    : accounts?.address ?? accounts;
  if (!address) throw new Error("No account returned from wallet");
  return typeof address === "string" ? address : String(address);
}

/* ── helpers ─────────────────────────────────────────────── */

/** Any value → lowercase hex string without 0x prefix */
function toHex(val) {
  if (!val) return "";
  if (typeof val === "string") return val.startsWith("0x") ? val.slice(2) : val;
  if (val instanceof Uint8Array) return Array.from(val).map(b => b.toString(16).padStart(2, "0")).join("");
  if (Array.isArray(val)) return val.map(b => Number(b).toString(16).padStart(2, "0")).join("");
  return String(val);
}

/** String → Uint8Array (UTF-8) */
function strToBytes(s) {
  return new TextEncoder().encode(s);
}

/* ── sign-in flow ─────────────────────────────────────────── */

export async function signInWithWallet() {
  const address = await connectWallet();

  // 1. Get a one-time challenge message from our backend
  const nonceRes = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!nonceRes.ok) throw new Error("Failed to get sign-in challenge from server");
  const { message } = await nonceRes.json();
  if (!message) throw new Error("Server returned empty challenge message");

  // 2. Ask the wallet to sign it.
  //    StarKey expects Uint8Array — pass bytes, not a plain string.
  const p = getProvider();
  const msgBytes = strToBytes(message);
  const raw = await p.signMessage(msgBytes);

  // 3. Normalise the response — StarKey may return Uint8Array values
  const signature = toHex(raw?.signature ?? raw?.sig ?? raw);
  const publicKey = toHex(raw?.publicKey ?? raw?.public_key ?? raw?.pubKey ?? "");

  if (!signature) throw new Error("Wallet returned empty signature");

  // 4. Send to backend for verification
  const verifyRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, signature, publicKey }),
  });
  const result = await verifyRes.json();
  if (!result.ok) throw new Error(result.error || "Sign-in verification failed");

  const session = { address: result.address, token: result.token };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
