import { C } from "../../theme";

export function Btn({ onClick, variant = "ghost", children, disabled, full, size = "md", style }) {
  const palettes = {
    primary: { bg: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`, fg: "#fff", border: "transparent", shadow: `0 6px 20px -6px ${C.accent}55` },
    supra: { bg: "rgba(52,211,153,0.12)", fg: C.supra, border: "rgba(52,211,153,0.32)" },
    danger: { bg: "rgba(248,113,113,0.12)", fg: C.danger, border: "rgba(248,113,113,0.32)" },
    ghost: { bg: C.raised, fg: C.text, border: C.borderLight },
    cyan: { bg: "rgba(79,209,197,0.12)", fg: C.accent2, border: "rgba(79,209,197,0.32)" },
  };
  const p = palettes[variant];
  const sizes = { sm: "8px 14px", md: "11px 19px", lg: "14px 26px" };
  const fsizes = { sm: "0.76rem", md: "0.84rem", lg: "0.92rem" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: p.bg, color: p.fg, border: `1px solid ${p.border}`,
        borderRadius: 12, padding: sizes[size], fontSize: fsizes[size], fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        width: full ? "100%" : "auto", fontFamily: C.sans,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "filter 0.15s, transform 0.12s, box-shadow 0.2s", whiteSpace: "nowrap",
        boxShadow: p.shadow || "none",
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}
