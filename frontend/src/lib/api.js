import { getSession, clearSession } from "../wallet";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${BASE}${url}`;
}

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return { ok: res.ok };
  try { return JSON.parse(text); }
  catch {
    console.error("[api] Non-JSON:", res.status, text.slice(0, 120));
    return { ok: false, error: `Server error ${res.status}` };
  }
}

// Always no-store so Cloudflare tunnel never caches API responses
const NO_CACHE = { "Cache-Control": "no-store", "Pragma": "no-cache" };

export const api = {
  async get(path) {
    const res = await fetch(`${BASE}/api${path}`, {
      headers: { ...authHeaders(), ...NO_CACHE },
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
  async post(path, body) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(), ...NO_CACHE },
      body: JSON.stringify(body || {}),
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
  async del(path) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "DELETE",
      headers: { ...authHeaders(), ...NO_CACHE },
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
};
