import { getSession, clearSession } from "../wallet";

// BASE is the backend URL.
// In production (Vercel): set VITE_API_URL environment variable to your tunnel URL.
// In development: leave empty — Vite proxies /api/* to localhost:3001.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return { ok: res.ok };
  try {
    return JSON.parse(text);
  } catch {
    console.error("[api] Non-JSON response:", res.status, text.slice(0, 120));
    return { ok: false, error: `Server error ${res.status}` };
  }
}

// Images (like /images/xyz.jpg) are served by the BACKEND, not the frontend
// origin — on a split deployment (Vercel frontend + VPS backend) a bare
// relative path resolves against the wrong domain. Always route it through
// the backend's own base URL.
export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url; // already absolute
  return `${BASE}${url}`;
}

export const api = {
  async get(path) {
    const res = await fetch(`${BASE}/api${path}`, {
      headers: { ...authHeaders() },
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
  async post(path, body) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
  async del(path) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
};
