import { C } from "../../theme";

export function Btn({ onClick, variant = "ghost", children, disabled, full, size = "md", style }) {
  const palettes = {
    primary: { bg: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`, fg: "#fff", border: "transparent", shadow: `0 4px 16px -4px ${C.accent}66` },
    supra: { bg: "rgba(61,220,145,0.12)", fg: C.supra, border: "rgba(61,220,145,0.32)" },
    danger: { bg: "rgba(255,107,129,0.12)", fg: C.danger, border: "rgba(255,107,129,0.32)" },
    ghost: { bg: C.raised, fg: C.text, border: C.borderLight },
    cyan: { bg: "rgba(62,217,208,0.12)", fg: C.accent2, border: "rgba(62,217,208,0.32)" },
  };
  const p = palettes[variant];
  const sizes = { sm: "7px 13px", md: "10px 18px", lg: "13px 24px" };
  const fsizes = { sm: "0.76rem", md: "0.84rem", lg: "0.92rem" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: p.bg, color: p.fg, border: `1px solid ${p.border}`,
        borderRadius: 10, padding: sizes[size], fontSize: fsizes[size], fontWeight: 600,
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
