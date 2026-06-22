import { C, fmt } from "../../theme";
import { Pill } from "../ui";

export function MobileHeader({ wallet, automation }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
      background: "rgba(16,14,26,0.85)", backdropFilter: "blur(10px)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: C.display }}>
        Supra<span style={{ color: C.accent }}>Post</span>
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <Pill color={C.supra}>⬡ {fmt(wallet.balance)}</Pill>
        <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>
          {automation.running ? "ON" : "OFF"}
        </Pill>
      </div>
    </div>
  );
}

export function MobileNav({ tabs, tab, setTab }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(16,14,26,0.9)", backdropFilter: "blur(12px)",
      borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map(({ id, icon, label }) => (
        <div
          key={id}
          onClick={() => setTab(id)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "11px 0 9px", cursor: "pointer",
            color: tab === id ? C.accent : C.muted, borderTop: `2px solid ${tab === id ? C.accent : "transparent"}`, transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>{icon}</span>
          <span style={{ fontSize: "0.62rem", marginTop: 4, fontWeight: 600 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
