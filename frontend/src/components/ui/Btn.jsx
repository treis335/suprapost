import { C } from "../../theme";

export function Btn({ onClick, variant = "ghost", children, disabled, full, size = "md", style }) {
  const p = {
    primary: { bg: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDeep} 100%)`, fg: "#fff",    border: "transparent",            shadow: `0 4px 16px -4px ${C.accent}44` },
    supra:   { bg: `${C.supra}14`,                                                   fg: C.supra,   border: `${C.supra}30`,           shadow: "none" },
    danger:  { bg: `${C.danger}12`,                                                  fg: C.danger,  border: `${C.danger}30`,          shadow: "none" },
    ghost:   { bg: C.raised,                                                          fg: C.text2,   border: C.border,                 shadow: "none" },
    cyan:    { bg: `${C.accent2}12`,                                                  fg: C.accent2, border: `${C.accent2}30`,         shadow: "none" },
  }[variant] || {};

  const pad = { sm: "6px 13px", md: "9px 18px", lg: "12px 24px" }[size];
  const fs  = { sm: "0.74rem",  md: "0.82rem",  lg: "0.9rem"   }[size];

  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: p.bg, color: p.fg,
      border: `0.5px solid ${p.border}`,
      borderRadius: 10, padding: pad,
      fontSize: fs, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      width: full ? "100%" : "auto",
      fontFamily: C.sans,
      display: "inline-flex", alignItems: "center",
      justifyContent: "center", gap: 6,
      transition: "opacity 0.15s, transform 0.1s, filter 0.15s",
      whiteSpace: "nowrap",
      boxShadow: p.shadow,
      letterSpacing: "0.01em",
      ...style,
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(1.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >{children}</button>
  );
}
