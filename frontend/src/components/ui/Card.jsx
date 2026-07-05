import { C } from "../../theme";

export function Card({ children, style, title, eyebrow, right, accentTop }) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%)`,
      border: `1px solid ${C.border}`, borderRadius: 18, padding: 22,
      position: "relative", overflow: "hidden",
      boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 16px 32px -20px rgba(0,0,0,0.55)",
      transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
      ...style,
    }}>
      {accentTop && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentTop}, transparent)` }} />}
      {(title || eyebrow) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div>
            {eyebrow && <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: C.mono, marginBottom: 5 }}>{eyebrow}</div>}
            {title && <div style={{ fontSize: "1.05rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.01em" }}>{title}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
