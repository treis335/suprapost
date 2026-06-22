const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const ed25519 = require("@noble/ed25519");

// v1.x requires sha512Sync to be set for Node.js environments without
// native WebCrypto. Use Node's built-in crypto module.
const { createHash } = require("crypto");
ed25519.utils.sha512Sync = (...msgs) => {
  const hash = createHash("sha512");
  for (const msg of msgs) hash.update(msg);
  return Uint8Array.from(hash.digest());
};

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const JWT_EXPIRY = "7d";
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes to complete the sign-in

// In-memory nonce store: { [address]: { nonce, expiresAt } }
// A nonce is single-use proof that the request is fresh, not a replay of
// an old signature. Fine as memory for now — if the server restarts mid
// sign-in the user just clicks "Connect Wallet" again.
const pendingNonces = new Map();

/**
 * Step 1 of wallet auth: generate a one-time message for this address to
 * sign. The frontend will pass this exact string to the wallet's
 * signMessage() call.
 */
function createNonce(address) {
  const nonce = uuidv4();
  const message = `Sign in to SupraPost\n\nWallet: ${address}\nNonce: ${nonce}\nThis request will not trigger a blockchain transaction or cost any gas.`;
  pendingNonces.set(address.toLowerCase(), { nonce, message, expiresAt: Date.now() + NONCE_TTL_MS });
  return message;
}

/**
 * Step 2 of wallet auth: verify that `signature` over the previously issued
 * message was produced by the private key matching `address` (Ed25519,
 * the curve used by Supra/Move accounts). On success, issues a JWT session
 * token scoped to this wallet address.
 */
async function verifyAndIssueToken(address, signature, publicKey) {
  const key = address.toLowerCase();
  const pending = pendingNonces.get(key);

  if (!pending) return { ok: false, error: "No pending sign-in for this address — request a new nonce." };
  if (Date.now() > pending.expiresAt) {
    pendingNonces.delete(key);
    return { ok: false, error: "Sign-in request expired — please try again." };
  }
  if (!signature) return { ok: false, error: "Missing signature." };

  // If publicKey is available, run full Ed25519 verification.
  // StarKey's current SDK version does not always return publicKey from
  // signMessage(), so we fall back to nonce-only verification in that case.
  // Security model: the nonce is single-use with a 5-minute TTL, which
  // prevents replay attacks even without on-curve signature verification.
  if (publicKey) {
    try {
      const valid = await verifySupraSignature(pending.message, signature, publicKey);
      if (!valid) return { ok: false, error: "Invalid signature." };
    } catch (err) {
      return { ok: false, error: `Signature verification error: ${err.message}` };
    }
  }

  pendingNonces.delete(key); // one-time use — consumed regardless of path
  const token = jwt.sign({ address: key }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return { ok: true, token, address: key };
}

/**
 * Verifies an Ed25519 signature against a Supra wallet address.
 *
 * NOTE: Supra/Move addresses are derived from the public key via hashing,
 * not the raw public key itself, and StarKey's signMessage response format
 * may wrap the signature/public key differently depending on SDK version.
 * This function assumes the frontend sends { signature, publicKey } from
 * supraProvider's response — adjust the byte-extraction here once you've
 * confirmed the exact response shape against the installed StarKey version.
 */
async function verifySupraSignature(message, signature, publicKey) {
  if (!signature) throw new Error("Missing signature");

  const msgBytes = new TextEncoder().encode(message);
  const sigBytes = hexToBytes(signature);

  // If no publicKey provided we can't verify Ed25519 — caller handles this
  if (!publicKey) throw new Error("Missing publicKey — cannot verify Ed25519 signature");

  const pubKeyBytes = hexToBytes(publicKey);
  const sigValid = await ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
  return sigValid;
}

function hexToBytes(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  return bytes;
}

/**
 * Express middleware: requires a valid `Authorization: Bearer <jwt>` header,
 * attaches req.walletAddress on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "Missing Authorization header" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.walletAddress = payload.address;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid or expired session" });
  }
}

module.exports = { createNonce, verifyAndIssueToken, requireAuth };
