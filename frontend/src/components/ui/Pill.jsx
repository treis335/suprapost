import { C } from "../../theme";

export function Pill({ children, color = C.muted, dot, pulse }) {
  return (
    <span style={{
      fontSize: "0.7rem", padding: "4px 11px", borderRadius: 20, fontFamily: C.mono,
      background: `${color}1a`, color, border: `1px solid ${color}3d`,
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}`, animation: pulse ? "softPulse 1.8s ease-in-out infinite" : "none" }} />}
      {children}
    </span>
  );
}
