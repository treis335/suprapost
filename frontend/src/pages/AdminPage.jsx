import { useState, useEffect } from "react";
import { C } from "../theme";
import { Btn } from "../components/ui/Btn";
import { Card } from "../components/ui/Card";
import { sendSupraTransfer } from "../payment";

const fmt = (n) => Number(n ?? 0).toFixed(2);

function authHeaders() {
  try {
    const raw = sessionStorage.getItem("suprapost_session");
    const s = raw ? JSON.parse(raw) : null;
    return s?.token ? { Authorization: `Bearer ${s.token}` } : {};
  } catch { return {}; }
}

export function AdminPage({ walletAddress }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/withdrawals", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.withdrawals); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function pay(w) {
    setError(null);
    setPayingId(w.id);
    try {
      const result = await sendSupraTransfer(walletAddress, w.toAddress, w.amount);
      if (!result?.hash) throw new Error("No transaction hash returned by StarKey.");

      const res = await fetch(`/api/admin/withdrawals/${w.address}/${w.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "paid", txHash: result.hash }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to mark as paid.");
      load();
    } catch (e) {
      setError(e.message || "Payment failed.");
    }
    setPayingId(null);
  }

  async function reject(w) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/withdrawals/${w.address}/${w.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "rejected" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      load();
    } catch (e) {
      setError(e.message || "Failed to reject.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: C.display, letterSpacing: "-0.02em" }}>Admin</div>
        <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>Pending referral-credit withdrawals. Pay sends SUPRA from this wallet via StarKey.</div>
      </div>

      {error && <div style={{ background: `${C.danger}14`, border: `1px solid ${C.danger}44`, borderRadius: 12, padding: "12px 16px", fontSize: "0.85rem", color: C.danger }}>{error}</div>}

      {loading && <div style={{ color: C.muted, fontSize: "0.85rem" }}>Loading…</div>}
      {!loading && items.length === 0 && <div style={{ color: C.muted, fontSize: "0.85rem" }}>No pending withdrawals.</div>}

      {items.map(w => (
        <Card key={w.id} style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: C.mono, fontSize: "1.2rem", color: C.supra, fontWeight: 700 }}>{fmt(w.amount)} SUPRA</div>
              <div style={{ fontSize: "0.76rem", color: C.muted, marginTop: 4, wordBreak: "break-all" }}>to 0x{w.toAddress}</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2 }}>requested {new Date(w.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" size="sm" onClick={() => reject(w)} disabled={payingId === w.id}>Reject</Btn>
              <Btn variant="supra" size="sm" onClick={() => pay(w)} disabled={payingId === w.id}>
                {payingId === w.id ? "Paying…" : "Pay"}
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
