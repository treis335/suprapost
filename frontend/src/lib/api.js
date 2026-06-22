export const api = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  },
  async del(path) {
    const res = await fetch(`/api${path}`, { method: "DELETE" });
    return res.json();
  },
};
