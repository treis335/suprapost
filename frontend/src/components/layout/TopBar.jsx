import { C, fmt } from "../../theme";
import { ConnStatus, Pill } from "../ui";

export function TopBar({ backendOk, wallet, automation }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 32px", borderBottom: `1px solid ${C.border}`,
      background: "rgba(16,14,26,0.6)", backdropFilter: "blur(10px)", flexWrap: "wrap", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontWeight: 700, fontSize: "1.25rem", fontFamily: C.display, letterSpacing: "-0.01em" }}>
          Supra<span style={{ color: C.accent }}>Post</span>
        </div>
        <span style={{ fontSize: "0.74rem", color: C.muted, borderLeft: `1px solid ${C.border}`, paddingLeft: 14 }}>
          AI Social Automation
        </span>
      </div>
      <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
        <ConnStatus ok={backendOk} />
        <Pill color={C.supra}>⬡ {fmt(wallet.balance)} SUPRA</Pill>
        <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>
          {automation.running ? "Automation active" : "Idle"}
        </Pill>
      </div>
    </div>
  );
}
