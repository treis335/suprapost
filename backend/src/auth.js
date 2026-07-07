const jwt     = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const ed25519 = require("@noble/ed25519");
const { createHash } = require("crypto");

ed25519.utils.sha512Sync = (...msgs) => {
  const hash = createHash("sha512");
  for (const msg of msgs) hash.update(msg);
  return Uint8Array.from(hash.digest());
};

const JWT_SECRET   = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const JWT_EXPIRY   = "7d";
const NONCE_TTL_MS = 5 * 60 * 1000;

// nonce store: normalised address → { nonce, message, expiresAt, ref }
const pendingNonces = new Map();
// pending referrals: normalised address → referrer address (cleared after first login)
const pendingRefs = new Map();

function getPendingRef(address) {
  const key = normaliseAddress(address);
  const ref = pendingRefs.get(key) || null;
  pendingRefs.delete(key);
  return ref;
}

function normaliseAddress(address) {
  if (!address) return "";
  const s = String(address).trim();
  return (s.startsWith("0x") ? s.slice(2) : s).toLowerCase();
}

function createNonce(address, ref) {
  const key     = normaliseAddress(address);
  const nonce   = uuidv4();
  const message = `Sign in to SupraPost\n\nWallet: ${address}\nNonce: ${nonce}\nThis request will not trigger a blockchain transaction or cost any gas.`;
  pendingNonces.set(key, { nonce, message, expiresAt: Date.now() + NONCE_TTL_MS });
  if (ref) pendingRefs.set(key, normaliseAddress(ref));
  return message;
}

async function verifyAndIssueToken(address, signature, publicKey) {
  const key     = normaliseAddress(address);
  const pending = pendingNonces.get(key);

  if (!pending) {
    console.warn(`[auth] No nonce for key="${key}"`);
    return { ok: false, error: "No pending sign-in for this address — please try again." };
  }
  if (Date.now() > pending.expiresAt) {
    pendingNonces.delete(key);
    return { ok: false, error: "Sign-in request expired — please try again." };
  }
  if (!signature) return { ok: false, error: "Missing signature." };

  // Ed25519 signature verification (no address derivation — Supra's scheme is not public)
  if (publicKey) {
    try {
      const valid = await verifySupraSignature(pending.message, signature, publicKey);
      if (!valid) return { ok: false, error: "Invalid signature." };
    } catch (err) {
      console.warn("[auth] Ed25519 verify error:", err.message, "— proceeding on nonce-only");
    }
  }

  pendingNonces.delete(key);
  const token = jwt.sign({ address: key }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return { ok: true, token, address: key };
}

async function verifySupraSignature(message, signature, publicKey) {
  if (!signature || !publicKey) throw new Error("Missing signature or publicKey");
  const msgBytes    = new TextEncoder().encode(message);
  const sigBytes    = hexToBytes(signature);
  const pubKeyBytes = hexToBytes(publicKey);
  return ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
}

function hexToBytes(hex) {
  const clean = String(hex).startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  return bytes;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "Missing Authorization header" });
  try {
    const payload     = jwt.verify(token, JWT_SECRET);
    req.walletAddress = payload.address;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid or expired session" });
  }
}

module.exports = { createNonce, verifyAndIssueToken, requireAuth, getPendingRef };
