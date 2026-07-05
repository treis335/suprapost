import { getSession, clearSession } from "../wallet";

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function parseResponse(res) {
  // If empty body (204, etc.) return ok indicator
  const text = await res.text();
  if (!text) return { ok: res.ok };
  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON response (error page, etc.)
    console.error("[api] Non-JSON response:", res.status, text.slice(0, 120));
    return { ok: false, error: `Server error ${res.status}` };
  }
}

export const api = {
  async get(path) {
    const res = await fetch(`/api${path}`, {
      headers: { ...authHeaders() },
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
  async del(path) {
    const res = await fetch(`/api${path}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (res.status === 401) { clearSession(); window.location.reload(); return { unauthorized: true }; }
    return parseResponse(res);
  },
};
