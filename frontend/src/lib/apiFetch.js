// lib/apiFetch.js — central fetch wrapper with BASE URL + auth headers
// Use this instead of fetch("/api/...") everywhere in the app.

import { getSession, clearSession } from "../wallet";

export const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Images (e.g. /images/xyz.jpg) are served by the BACKEND, not the frontend
// origin — on a split deployment (Vercel frontend + VPS backend) a bare
// relative path resolves against the wrong domain. Always route it through
// the backend's own base URL.
export function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url; // already absolute
  return `${BASE}${url}`;
}

export function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { clearSession(); window.location.reload(); }
  return res;
}
