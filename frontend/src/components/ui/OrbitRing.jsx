import { C } from "../../theme";

/* ============================================================
   ORBIT RING — signature element
   A circular cycle indicator. When automation is running, the
   ring sweeps from empty to full across the cycle duration, then
   resets — visualising the bot's heartbeat instead of a flat
   countdown number.
============================================================ */
export function OrbitRing({ progress = 0, running, size = 168, label, sublabel }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={running ? C.accent : C.muted}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1), stroke 0.4s" }}
        />
        {running && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.accent} strokeWidth={stroke}
            strokeDasharray={`1 ${c - 1}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${C.accent})`, animation: "spinSlow 999999s linear" }}
            strokeDashoffset={offset} />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <div style={{ fontFamily: C.mono, fontSize: size > 140 ? "1.5rem" : "1.1rem", fontWeight: 600, color: C.text, letterSpacing: "0.02em" }}>{label}</div>
        {sublabel && <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>{sublabel}</div>}
      </div>
    </div>
  );
}
