import { C, fmt } from "../../theme";
import { Btn, Card } from "../ui";

export function Sidebar({ tabs, tab, setTab, wallet, topUp, compact }) {
  return (
    <div style={{
      borderRight: `1px solid ${C.border}`, padding: compact ? "20px 12px" : "24px 16px",
      display: "flex", flexDirection: "column", gap: 5, overflowY: "auto",
    }}>
      {tabs.map(({ id, icon, label }) => (
        <div
          key={id}
          onClick={() => setTab(id)}
          style={{
            display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 10, cursor: "pointer",
            fontSize: "0.88rem", fontWeight: 500, color: tab === id ? C.text : C.text2,
            background: tab === id ? `linear-gradient(135deg, ${C.accent}26, ${C.accent}0d)` : "transparent",
            border: `1px solid ${tab === id ? C.accent + "40" : "transparent"}`, transition: "all 0.18s",
          }}
        >
          <span style={{ fontSize: "1.05rem", width: 18, textAlign: "center" }}>{icon}</span> {label}
        </div>
      ))}

      <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "24px 14px 9px" }}>Wallet</div>
      <Card style={{ padding: 16 }}>
        <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Balance</div>
        <div style={{ fontFamily: C.mono, fontSize: "1.5rem", color: C.supra, fontWeight: 600, marginTop: 5 }}>{fmt(wallet.balance)}</div>
        <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>SUPRA tokens</div>
        <Btn full variant="supra" size="sm" style={{ marginTop: 12 }} onClick={() => topUp(10)}>+ Add 10 SUPRA</Btn>
      </Card>

      <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "18px 14px 9px" }}>Cost / Post</div>
      <Card style={{ padding: 16 }}>
        <div style={{ fontFamily: C.mono, fontSize: "1.15rem", color: C.accent, fontWeight: 600 }}>{fmt(wallet.costPerPost)} SUPRA</div>
        <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>~$0.05 in API cost</div>
      </Card>
    </div>
  );
}
