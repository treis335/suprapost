import { useEffect, useRef, useState } from "react";
import { C } from "../../theme";
import { Pill } from "./Pill";

export function ScoreBar({ label, score }) {
  const color = score >= 8 ? C.supra : score >= 6.5 ? C.warn : C.danger;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
      <span style={{ width: 98, fontSize: "0.74rem", color: C.text2, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: C.bg, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 4, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span style={{ fontSize: "0.76rem", color, fontFamily: C.mono, width: 32, textAlign: "right", fontWeight: 600 }}>{score.toFixed(1)}</span>
    </div>
  );
}

export function TweetPreview({ text, via = "SupraPost" }) {
  return (
    <div style={{ background: "#000", border: "1px solid #2a2d3a", borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", gap: 11, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: "#fff",
          fontFamily: C.display,
        }}>S</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f1f3f9" }}>SupraPost Bot</div>
          <div style={{ fontSize: "0.74rem", color: "#71767b" }}>via {via}</div>
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#e7e9ea" }}>{text}</div>
    </div>
  );
}

export function Log({ lines }) {
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);
  return (
    <div ref={ref} style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 13,
      fontFamily: C.mono, fontSize: "0.72rem", lineHeight: 1.95,
      maxHeight: 180, overflowY: "auto",
    }}>
      {!lines || lines.length === 0
        ? <span style={{ color: C.muted }}>// waiting for next action...</span>
        : lines.map((l, i) => <div key={i} className="fade-up" style={{ color: colorFor(l.msg) }}>[{new Date(l.time).toLocaleTimeString()}] {l.msg}</div>)}
    </div>
  );
}

function colorFor(msg = "") {
  if (msg.startsWith("✕") || msg.includes("error") || msg.includes("Failed") || msg.includes("failed")) return C.danger;
  if (msg.startsWith("⚠")) return C.warn;
  if (msg.startsWith("✓") || msg.startsWith("✅") || msg.startsWith("⬡") || msg.startsWith("🚀")) return C.supra;
  if (msg.startsWith("🤖") || msg.startsWith("🧠")) return C.accent;
  return C.muted;
}

export function StatTile({ label, value, color, suffix }) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ fontFamily: C.mono, fontSize: "1.7rem", fontWeight: 600, color, lineHeight: 1 }}>
        {value}{suffix && <span style={{ fontSize: "0.9rem", opacity: 0.6 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: "0.67rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 7 }}>{label}</div>
    </div>
  );
}

export function ConnStatus({ ok }) {
  return <Pill color={ok ? C.supra : C.danger} dot pulse={ok}>{ok ? "server online" : "server offline"}</Pill>;
}

/* ── ChannelPreview ── shows how the post looks per platform ── */
export function ChannelPreview({ text, channels }) {
  const previews = channels.filter(c => c.id && ["telegram","twitter","discord","instagram"].includes(c.id));
  const [active, setActive] = useState(previews[0]?.id || "telegram");

  if (!text?.trim() || previews.length === 0) return null;

  const channel = previews.find(c => c.id === active) || previews[0];

  const configs = {
    telegram: {
      bg: "#17212b", border: "#2b5278", bubble: "#2b5278",
      header: { icon: "✈", name: "SupraPost", color: "#34b7eb" },
      render: (t) => (
        <div style={{ background: "#17212b", borderRadius: 12, padding: 14, border: "1px solid #2b527844" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#34b7eb22", border: "1px solid #34b7eb44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>✈</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#34b7eb" }}>SupraPost</div>
              <div style={{ fontSize: "0.68rem", color: "#708499" }}>Bot</div>
            </div>
          </div>
          <div style={{ background: "#2b5278", borderRadius: "4px 12px 12px 12px", padding: "10px 13px" }}>
            <div style={{ fontSize: "0.86rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#e4ecf4" }}>{t}</div>
            <div style={{ fontSize: "0.64rem", color: "#708499", marginTop: 6, textAlign: "right" }}>just now ✓✓</div>
          </div>
        </div>
      ),
    },
    twitter: {
      render: (t) => (
        <div style={{ background: "#000", borderRadius: 12, padding: 16, border: "1px solid #2f3336" }}>
          <div style={{ display: "flex", gap: 11, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: "#fff", flexShrink: 0 }}>S</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#e7e9ea" }}>SupraPost</div>
              <div style={{ fontSize: "0.74rem", color: "#71767b" }}>@suprapost_bot</div>
            </div>
          </div>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#e7e9ea", marginBottom: 12 }}>
            {t.length > 280 ? t.slice(0, 277) + "..." : t}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#71767b", fontSize: "0.78rem" }}>
            <span>💬 0</span><span>🔁 0</span><span>❤️ 0</span><span>📊</span>
          </div>
          {t.length > 280 && (
            <div style={{ fontSize: "0.68rem", color: "#1d9bf0", marginTop: 6 }}>Text truncated to 280 chars for Twitter</div>
          )}
        </div>
      ),
    },
    discord: {
      render: (t) => (
        <div style={{ background: "#313338", borderRadius: 12, padding: 14, border: "1px solid #1e1f2244" }}>
          <div style={{ display: "flex", gap: 11 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#5865F222", border: "1px solid #5865F244", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🎮</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#5865F2" }}>SupraPost</span>
                <span style={{ fontSize: "0.64rem", color: "#5c5e66", background: "#5865F222", padding: "1px 5px", borderRadius: 4 }}>BOT</span>
                <span style={{ fontSize: "0.68rem", color: "#5c5e66" }}>Today at {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2,"0")}</span>
              </div>
              <div style={{ fontSize: "0.88rem", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#dbdee1" }}>{t}</div>
            </div>
          </div>
        </div>
      ),
    },
    instagram: {
      render: (t) => (
        <div style={{ background: "#000", borderRadius: 12, border: "1px solid #262626", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderBottom: "1px solid #262626" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>📷</div>
            <span style={{ fontWeight: 700, fontSize: "0.84rem", color: "#fff" }}>suprapost_bot</span>
          </div>
          <div style={{ background: "#111", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "2rem" }}>🖼</div>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ fontSize: "0.82rem", lineHeight: 1.55, color: "#e0e0e0" }}>
              <span style={{ fontWeight: 700, color: "#fff" }}>suprapost_bot </span>
              {t.length > 150 ? t.slice(0, 147) + "... more" : t}
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div>
      {/* Channel tabs */}
      {previews.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {previews.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)} style={{
              all: "unset", cursor: "pointer",
              padding: "5px 12px", borderRadius: 8,
              fontSize: "0.76rem", fontWeight: 600,
              background: active === c.id ? `${c.color}18` : "transparent",
              border: `1px solid ${active === c.id ? c.color + "55" : "transparent"}`,
              color: active === c.id ? c.color : C.muted,
              transition: "all 0.15s",
            }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}
      {/* Preview */}
      <div className="fade-up" key={active}>
        {configs[active]?.render(text) || (
          <div style={{ fontSize: "0.8rem", color: C.muted, padding: "20px 0", textAlign: "center" }}>
            Preview not available for this channel
          </div>
        )}
      </div>
    </div>
  );
}
