import { C, fmt } from "../../theme";
import { Btn, Card } from "../ui";

export function Sidebar({ tabs, tab, setTab, wallet, topUp, compact }) {
  return (
    <div style={{
      borderRight: `1px solid ${C.border}`, padding: compact ? "22px 14px" : "26px 18px",
      display: "flex", flexDirection: "column", gap: 6, overflowY: "auto",
    }}>
      {tabs.map(({ id, icon, label }) => (
        <div
          key={id}
          onClick={() => setTab(id)}
          onMouseEnter={(e) => { if (tab !== id) e.currentTarget.style.background = C.raised; }}
          onMouseLeave={(e) => { if (tab !== id) e.currentTarget.style.background = "transparent"; }}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", borderRadius: 12, cursor: "pointer",
            fontSize: "0.88rem", fontWeight: 500, color: tab === id ? C.text : C.text2,
            background: tab === id ? `linear-gradient(135deg, ${C.accent}26, ${C.accent}0d)` : "transparent",
            border: `1px solid ${tab === id ? C.accent + "40" : "transparent"}`, transition: "all 0.18s",
          }}
        >
          <span style={{ fontSize: "1.05rem", width: 18, textAlign: "center" }}>{icon}</span> {label}
        </div>
      ))}

      <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "26px 15px 10px" }}>Wallet</div>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total balance</div>
        <div style={{ fontFamily: C.mono, fontSize: "1.5rem", color: C.supra, fontWeight: 600, marginTop: 6 }}>{fmt(wallet.balance + (wallet.creditBalance || 0))}</div>
        <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 4 }}>SUPRA tokens</div>
        {!!wallet.creditBalance && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem" }}>
              <span style={{ color: C.muted }}>Deposited</span><span style={{ fontFamily: C.mono, color: C.text2 }}>{fmt(wallet.balance)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginTop: 4 }}>
              <span style={{ color: C.muted }}>Referral credits</span><span style={{ fontFamily: C.mono, color: C.accent2 }}>{fmt(wallet.creditBalance)}</span>
            </div>
          </div>
        )}
        <Btn full variant="supra" size="sm" style={{ marginTop: 14 }} onClick={() => topUp(10)}>+ Add 10 SUPRA</Btn>
      </Card>

      <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "20px 15px 10px" }}>Cost / Post</div>
      <Card style={{ padding: 18 }}>
        <div style={{ fontFamily: C.mono, fontSize: "1.15rem", color: C.accent, fontWeight: 600 }}>{fmt(wallet.costPerPost)} SUPRA</div>
        <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 4 }}>~$0.05 in API cost</div>
      </Card>
    </div>
  );
}
