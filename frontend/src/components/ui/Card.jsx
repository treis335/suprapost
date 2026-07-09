import { C } from "../../theme";

export function Card({ children, style, title, eyebrow, right, accentTop }) {
  return (
    <div style={{
      background: C.surface2,
      border: `0.5px solid ${C.border}`,
      borderRadius: 16,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 1px 0 rgba(255,255,255,0.025) inset",
      ...style,
    }}>
      {accentTop && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
          background: `linear-gradient(90deg, transparent 0%, ${accentTop}88 40%, ${accentTop}88 60%, transparent 100%)`,
        }} />
      )}
      {(title || eyebrow) && (
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16, gap: 10,
        }}>
          <div>
            {eyebrow && (
              <div style={{
                fontSize: "0.6rem", color: C.muted,
                textTransform: "uppercase", letterSpacing: "0.18em",
                fontFamily: C.mono, marginBottom: 4,
              }}>{eyebrow}</div>
            )}
            {title && (
              <div style={{
                fontSize: "0.96rem", fontWeight: 600,
                fontFamily: C.display, letterSpacing: "-0.01em",
                color: C.text,
              }}>{title}</div>
            )}
          </div>
          {right && <div style={{ flexShrink: 0 }}>{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
