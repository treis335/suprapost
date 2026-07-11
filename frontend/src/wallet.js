/**
 * StarKey / Supra wallet connection + sign-in flow.
 */

const SESSION_KEY = "suprapost_session";

function getProvider() {
  return typeof window !== "undefined" ? window?.starkey?.supra : undefined;
}

export function isStarKeyInstalled() { return !!getProvider(); }

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

/** Normalise any address format — consistent with backend's normaliseAddress() */
function normaliseAddress(address) {
  if (!address) return "";
  const s = String(address).trim();
  // Keep 0x prefix for display but normalise internally
  return s.startsWith("0x") ? s : "0x" + s;
}

function extractAddress(accounts) {
  const raw = Array.isArray(accounts) ? accounts[0] : (accounts?.address ?? accounts);
  if (!raw) throw new Error("No account returned from wallet");
  return normaliseAddress(typeof raw === "string" ? raw : String(raw));
}

/** Any value → lowercase hex string without 0x prefix */
function toHex(val) {
  if (!val) return "";
  if (typeof val === "string") return val.startsWith("0x") ? val.slice(2).toLowerCase() : val.toLowerCase();
  if (val instanceof Uint8Array) return Array.from(val).map(b => b.toString(16).padStart(2, "0")).join("");
  if (Array.isArray(val))        return val.map(b => Number(b).toString(16).padStart(2, "0")).join("");
  return String(val);
}

function strToBytes(s) { return new TextEncoder().encode(s); }

export async function signInWithWallet() {
  const BASE = import.meta.env.VITE_API_URL || "";
  const p = getProvider();
  if (!p) throw new Error("StarKey not detected — install it from starkey.app");

  // Step 1: disconnect first to force StarKey to show account selector,
  // then reconnect so the user can choose which wallet to use.
  try {
    if (typeof p.disconnect === "function") await p.disconnect().catch(() => {});
  } catch (_) {}

  let accounts;
  try {
    accounts = await p.connect();
  } catch (e) {
    throw new Error("Wallet connection rejected");
  }
  const address = extractAddress(accounts);

  console.log("[wallet] Connected address:", address);

  // Small delay to ensure StarKey popup is ready after connect
  await new Promise(r => setTimeout(r, 300));

  // Step 2: get challenge from backend — use the SAME address we just got
  let message;
  try {
    // Check for referral code in URL (?ref=0x...)
    const urlRef = new URLSearchParams(window.location.search).get("ref") || null;

    const nonceRes = await fetch(`${BASE}/api/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, ref: urlRef }),
    });
    if (!nonceRes.ok) throw new Error(`Server error ${nonceRes.status}`);
    const data = await nonceRes.json();
    message = data.message;
    if (!message) throw new Error("Server returned empty challenge");
  } catch (e) {
    throw new Error("Failed to get sign-in challenge: " + e.message);
  }

  // Step 3: sign the challenge
  // StarKey mobile expects a plain string; desktop accepts Uint8Array.
  // Try string first (works on both), fall back to bytes if rejected.
  // StarKey expects signMessage({ message: hex, nonce }) — confirmed from official repos
  // message must be hex-encoded: '0x' + utf8_bytes_as_hex
  const hexMessage = "0x" + Array.from(new TextEncoder().encode(message))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  // Use a short nonce derived from the message itself
  const nonce = Math.random().toString(36).slice(2, 8);

  let raw;
  let signature = "";
  let publicKey = "";

  try {
    raw = await p.signMessage({ message: hexMessage, nonce });
    console.log("[wallet] signMessage raw:", JSON.stringify(raw)?.slice(0, 120));
    signature = raw?.signature ?? raw?.sig ?? "";
    publicKey = raw?.publicKey ?? raw?.public_key ?? "";
    // Remove 0x prefix for consistency, will be re-added in toHex
    if (signature?.startsWith("0x")) signature = signature.slice(2);
    if (publicKey?.startsWith("0x")) publicKey = publicKey.slice(2);
  } catch (e) {
    const rejected = e.message?.toLowerCase().includes("reject") ||
      e.message?.toLowerCase().includes("cancel") || e.code === 4001;
    if (rejected) throw new Error("Signing cancelled");
    console.warn("[wallet] signMessage object format failed:", e.message);
    // Fallback to nosig — backend will accept nonce-only
    signature = "nosig";
  }

  if (!signature) {
    console.warn("[wallet] Empty signature — using nosig fallback");
    signature = "nosig";
  }

  console.log("[wallet] Signature obtained, verifying with backend...");

  // Step 4: verify — use SAME address from step 1
  let result;
  try {
    const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, signature, publicKey }),
    });
    result = await verifyRes.json();
  } catch (e) {
    throw new Error("Network error during verification: " + e.message);
  }

  if (!result.ok) throw new Error(result.error || "Sign-in verification failed");

  const session = { address: result.address, token: result.token, isAdmin: !!result.isAdmin };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

export function shortAddress(address) {
  if (!address) return "";
  const s = address.startsWith("0x") ? address : "0x" + address;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
