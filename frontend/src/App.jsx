import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "./theme";
import { isStarKeyInstalled, waitForStarKey, signInWithWallet, getSession, clearSession, shortAddress } from "./wallet";
import { ComposePage } from "./pages/ComposePage";
import { DepositPage } from "./pages/DepositPage";
import { depositSupra } from "./payment";

/* ============================================================
   DESIGN SYSTEM — "Pulse" v2
   A living, breathing automation product. The signature element
   is the orbit ring: a circular progress indicator that visualises
   the automation cycle as something alive, not just a countdown.

   This revision adds: a real 3-tier responsive system (mobile /
   tablet / desktop), a Channels surface for multi-platform
   broadcasting, smoother tab transitions, and tighter polish
   throughout (hover depth, focus rings, spacing rhythm).
============================================================ */
const TABS = [
  { id: "setup", icon: "⚙", label: "Setup" },
  { id: "channels", icon: "📡", label: "Channels" },
  { id: "compose",  icon: "✦", label: "Compose" },
  { id: "automation", icon: "⚡", label: "Automation" },
  { id: "history", icon: "📋", label: "History" },
  { id: "deposit", icon: "⬡", label: "Deposit" },
];

const fmt = (n) => Number(n ?? 0).toFixed(2);

function fmtCountdown(ms) {
  if (ms <= 0) return "Now";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), sec = s % 60;
  if (m < 60) return `${m}m ${sec}s`;
  const h = Math.floor(m / 60), min = m % 60;
  return `${h}h ${min}m`;
}

/* ============================================================
   API CLIENT — attaches the wallet session JWT to every request.
   A 401 means the session expired or was never valid; callers can
   check `unauthorized` on the result and bounce back to the login screen.
============================================================ */
function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

const api = {
  async get(path) {
    const res = await fetch(`/api${path}`, { headers: { ...authHeaders() } });
    if (res.status === 401) return { unauthorized: true };
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    });
    if (res.status === 401) return { unauthorized: true };
    return res.json();
  },
  async del(path) {
    const res = await fetch(`/api${path}`, { method: "DELETE", headers: { ...authHeaders() } });
    if (res.status === 401) return { unauthorized: true };
    return res.json();
  },
};

// Deposit API is handled by frontend/src/payment.js

/* ============================================================
   RESPONSIVE — 3 tiers: mobile (<700), tablet (700-1080), desktop (1080+)
============================================================ */
function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return {
    width: w,
    isMobile: w < 700,
    isTablet: w >= 700 && w < 1080,
    isDesktop: w >= 1080,
  };
}

/* ============================================================
   GLOBAL KEYFRAMES (injected once)
============================================================ */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.borderLight}; border-radius: 4px; }

    @keyframes softPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .fade-up { animation: fadeUp 0.4s cubic-bezier(.2,.8,.2,1) both; }
    .scale-in { animation: scaleIn 0.3s cubic-bezier(.2,.8,.2,1) both; }

    input::placeholder, textarea::placeholder { color: ${C.muted}; }
    input:focus, textarea:focus, select:focus { outline: none; }

    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }
  `}</style>
);

/* ============================================================
   ORBIT RING — signature element
============================================================ */
function OrbitRing({ progress = 0, running, size = 168, label, sublabel }) {
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
            style={{ filter: `drop-shadow(0 0 6px ${C.accent})` }}
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

/* ============================================================
   PRIMITIVES
============================================================ */
function Btn({ onClick, variant = "ghost", children, disabled, full, size = "md", style }) {
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

function Card({ children, style, title, eyebrow, right, accentTop }) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%)`,
      border: `1px solid ${C.border}`, borderRadius: 16, padding: 20,
      position: "relative", overflow: "hidden",
      boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 12px 24px -16px rgba(0,0,0,0.5)",
      ...style,
    }}>
      {accentTop && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentTop}, transparent)` }} />}
      {(title || eyebrow) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            {eyebrow && <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: C.mono, marginBottom: 4 }}>{eyebrow}</div>}
            {title && <div style={{ fontSize: "1rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.01em" }}>{title}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <div style={{ fontSize: "0.76rem", color: C.text2, marginBottom: 7, fontWeight: 500 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: "0.67rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
  color: C.text, fontFamily: C.sans, fontSize: "0.86rem", padding: "11px 14px",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
};

function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }}
    onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}22`; }}
    onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 90, resize: "vertical", fontFamily: C.sans, lineHeight: 1.6, ...(props.style || {}) }}
    onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}22`; }}
    onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }} />;
}
function Select(props) {
  return <select {...props} style={{ ...inputStyle, cursor: "pointer", ...(props.style || {}) }} />;
}

function Pill({ children, color = C.muted, dot, pulse }) {
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

function ScoreBar({ label, score }) {
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

function TweetPreview({ text }) {
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
          <div style={{ fontSize: "0.74rem", color: "#71767b" }}>preview</div>
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap", color: "#e7e9ea" }}>{text}</div>
    </div>
  );
}

function Log({ lines }) {
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
  if (msg.startsWith("✕") || msg.includes("error") || msg.includes("Failed")) return C.danger;
  if (msg.startsWith("⚠")) return C.warn;
  if (msg.startsWith("✓") || msg.startsWith("✅") || msg.startsWith("⬡") || msg.startsWith("🚀")) return C.supra;
  if (msg.startsWith("🤖") || msg.startsWith("🧠")) return C.accent;
  return C.muted;
}

function StatTile({ label, value, color, suffix }) {
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

function ConnStatus({ ok }) {
  return <Pill color={ok ? C.supra : C.danger} dot pulse={ok}>{ok ? "server online" : "server offline"}</Pill>;
}

const CHANNEL_ICONS = {
  telegram: "✈",
  twitter: "𝕏",
  instagram: "◫",
  discord: "◆",
};

// Which credential fields each channel needs, and whether it's even
// possible to configure yet (Twitter/Instagram need real OAuth — until
// that's built, editing credentials for them is disabled with a note).
const CHANNEL_FIELDS = {
  telegram: {
    oauthOnly: false,
    fields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF...", type: "password" },
      { key: "chatId", label: "Chat ID", placeholder: "987654321", type: "text" },
    ],
    help: "Get a bot token from @BotFather on Telegram. For the chat id: message your bot once, then visit https://api.telegram.org/bot<TOKEN>/getUpdates and look for \"chat\":{\"id\": ...}.",
  },
  discord: {
    oauthOnly: false,
    fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/...", type: "password" },
    ],
    help: "In Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy URL.",
  },
  twitter: { oauthOnly: true, fields: [], help: "Twitter/X connects via OAuth — coming soon." },
  instagram: { oauthOnly: true, fields: [], help: "Instagram connects via Facebook Login — coming soon." },
};

/**
 * One row per platform. Shows connection state clearly:
 *  - not connected: dimmed, "not configured" pill, toggle disabled
 *  - connected but disabled: toggle off, user can opt-in
 *  - connected and enabled: toggle on, glowing pill
 * Click the row to expand credential fields (for non-OAuth channels).
 */
function ChannelRow({ id, channel, onToggle, onSaveCredentials }) {
  const { label, connected, enabled } = channel;
  const [expanded, setExpanded] = useState(false);
  const config = CHANNEL_FIELDS[id] || { oauthOnly: true, fields: [], help: "" };
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSaveCredentials(id, formValues);
    setSaving(false);
    setFormValues({});
  }

  return (
    <div style={{
      borderRadius: 12, background: C.bg,
      border: `1px solid ${enabled && connected ? C.accent + "44" : C.border}`,
      opacity: connected || expanded ? 1 : 0.7, transition: "all 0.2s", overflow: "hidden",
    }}>
      <div
        onClick={() => !config.oauthOnly && setExpanded((e) => !e)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", cursor: config.oauthOnly ? "default" : "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: enabled && connected ? `${C.accent}22` : C.surface2,
            color: enabled && connected ? C.accent : C.muted,
            fontSize: "1rem", fontFamily: C.display,
          }}>{CHANNEL_ICONS[id] || "●"}</div>
          <div>
            <div style={{ fontSize: "0.84rem", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 2 }}>
              {config.oauthOnly ? "coming soon" : connected ? (enabled ? "broadcasting" : "connected · paused") : "tap to configure"}
            </div>
          </div>
        </div>
        <label
          onClick={(e) => e.stopPropagation()}
          style={{ position: "relative", display: "inline-block", width: 40, height: 23, flexShrink: 0, cursor: connected ? "pointer" : "not-allowed" }}
        >
          <input
            type="checkbox"
            checked={enabled}
            disabled={!connected}
            onChange={(e) => onToggle(id, e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: "absolute", inset: 0, borderRadius: 23,
            background: enabled && connected ? C.accent : C.border,
            transition: "background 0.2s",
          }}>
            <span style={{
              position: "absolute", top: 3, left: enabled ? 20 : 3,
              width: 17, height: 17, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </span>
        </label>
      </div>

      {expanded && !config.oauthOnly && (
        <div className="fade-up" style={{ padding: "0 15px 15px" }}>
          <div style={{ height: 1, background: C.border, marginBottom: 13 }} />
          {config.fields.map((f) => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <Input
                type={f.type}
                placeholder={f.placeholder}
                value={formValues[f.key] ?? ""}
                onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                style={{ fontSize: "0.8rem" }}
              />
            </div>
          ))}
          <div style={{ fontSize: "0.65rem", color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>{config.help}</div>
          <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : connected ? "Update credentials" : "Save & Connect"}
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DEPOSIT HISTORY — lista os depósitos confirmados do utilizador
============================================================ */
function DepositHistory() {
  const [deposits, setDeposits] = React.useState(null); // null=loading, []=vazio
  const [open, setOpen] = React.useState(false);

  async function load() {
    try {
      const session = getSession();
      const res = await fetch("/api/wallet/deposits", {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      });
      const data = await res.json();
      setDeposits(data.ok ? data.deposits : []);
    } catch {
      setDeposits([]);
    }
  }

  function toggle() {
    if (!open && deposits === null) load();
    setOpen(o => !o);
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function shortHash(h) {
    if (!h) return "—";
    return h.slice(0, 8) + "…" + h.slice(-6);
  }

  function explorerUrl(hash) {
    const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
    return `https://suprascan.io/tx/${clean}`;
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={toggle}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.text2, fontSize: "0.76rem", padding: 0,
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        <span style={{ fontSize: "0.65rem", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
        Histórico de depósitos
      </button>

      {open && (
        <div style={{ marginTop: 10 }} className="fade-up">
          {deposits === null && (
            <div style={{ fontSize: "0.73rem", color: C.muted }}>A carregar...</div>
          )}
          {deposits !== null && deposits.length === 0 && (
            <div style={{ fontSize: "0.73rem", color: C.muted }}>Sem depósitos registados.</div>
          )}
          {deposits !== null && deposits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {deposits.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: C.surface2, borderRadius: 8, padding: "7px 11px",
                    fontSize: "0.73rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ color: C.supra, fontWeight: 600 }}>+{d.amount} SUPRA</span>
                    <span style={{ color: C.muted }}>{fmtDate(d.createdAt)}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {d.txHash ? (
                      <a
                        href={explorerUrl(d.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: C.accent, textDecoration: "none", fontFamily: C.mono, fontSize: "0.68rem" }}
                        title={d.txHash}
                      >
                        {shortHash(d.txHash)} ↗
                      </a>
                    ) : (
                      <span style={{ color: C.muted, fontFamily: C.mono, fontSize: "0.68rem" }}>sem hash</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TOP UP FLOW — uses payment.js which handles StarKey directly.
============================================================ */
function TopUpFlow({ walletAddress, onCredited }) {
  const [amount, setAmount] = useState(10);
  const [status, setStatus] = useState(null); // null | { step, message }
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [done, setDone] = useState(false);

  async function handleDeposit() {
    setError("");
    setTxHash("");
    setDone(false);
    const result = await depositSupra(walletAddress, Number(amount), setStatus);
    setStatus(null);
    if (result.ok) {
      setDone(true);
      if (result.txHash) setTxHash(result.txHash);
      onCredited?.();
    } else {
      setError(result.error || "Deposit failed");
      // Se a TX foi enviada mas backend falhou, mostra o hash para referência
      if (result.txHash) setTxHash(result.txHash);
    }
  }

  function reset() { setDone(false); setError(""); setStatus(null); setTxHash(""); }

  if (done) {
    return (
      <div className="scale-in">
        <div style={{ fontSize: "0.84rem", color: C.supra, fontWeight: 600, marginBottom: 10 }}>
          ✓ {amount} SUPRA depositados com sucesso
        </div>
        {txHash && (
          <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: 10, wordBreak: "break-all" }}>
            TX: {txHash.slice(0, 20)}...
          </div>
        )}
        <Btn variant="ghost" size="sm" onClick={reset}>Fazer outro depósito</Btn>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Input
          type="number" min="1" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ flex: 1 }}
          disabled={!!status}
        />
        <Btn variant="supra" onClick={handleDeposit} disabled={!!status}>
          {status ? "..." : "Depositar"}
        </Btn>
      </div>
      {status && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: C.text2 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: "softPulse 1.2s ease-in-out infinite", display: "inline-block", flexShrink: 0 }} />
          {status.message}
        </div>
      )}
      {error && (
        <div style={{ fontSize: "0.74rem", color: C.danger, marginTop: 6 }}>
          ❌ {error}
          {txHash && (
            <div style={{ marginTop: 4, color: C.muted, wordBreak: "break-all" }}>
              TX enviada: {txHash.slice(0, 20)}... (contacta suporte)
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   LOGIN SCREEN — wallet-based sign-in, no passwords or emails.
   Connect StarKey -> sign a one-time message -> backend verifies and
   issues a session. This IS the account system: the wallet address is
   the user ID.
============================================================ */
function LoginScreen({ onSignedIn, isMobile }) {
  const [installed, setInstalled] = useState(null); // null = checking
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    waitForStarKey().then(setInstalled);
  }, []);

  async function handleConnect() {
    setError(""); setConnecting(true);
    try {
      const session = await signInWithWallet();
      onSignedIn(session);
    } catch (err) {
      setError(err.message || "Sign-in failed");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div style={{ background: C.bgGrad, color: C.text, minHeight: "100vh", fontFamily: C.sans, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <GlobalStyle />
      <div className="scale-in" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: isMobile ? "1.6rem" : "1.9rem", fontFamily: C.display, letterSpacing: "-0.02em" }}>
            Supra<span style={{ color: C.accent }}>Post</span>
          </div>
          <div style={{ fontSize: "0.84rem", color: C.muted, marginTop: 8 }}>AI social automation, paid for in SUPRA</div>
        </div>

        <Card accentTop={C.accent} style={{ textAlign: "center", padding: isMobile ? "28px 22px" : "36px 30px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.8rem", boxShadow: `0 8px 24px -8px ${C.accent}88`,
          }}>⬡</div>

          <div style={{ fontSize: "1.05rem", fontWeight: 600, fontFamily: C.display, marginBottom: 8 }}>
            Sign in with your Supra wallet
          </div>
          <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6, marginBottom: 26 }}>
            No password, no email. Your wallet address is your account —
            connect once and sign a free message to prove it's yours.
          </div>

          {installed === false && (
            <div style={{ fontSize: "0.78rem", color: C.warn, background: `${C.warn}14`, border: `1px solid ${C.warn}33`, borderRadius: 10, padding: 12, marginBottom: 16, lineHeight: 1.6 }}>
              StarKey wallet not detected. Install the extension from{" "}
              <a href="https://starkey.app" target="_blank" rel="noreferrer" style={{ color: C.warn }}>starkey.app</a>, then reload this page.
            </div>
          )}

          {error && (
            <div style={{ fontSize: "0.78rem", color: C.danger, background: `${C.danger}14`, border: `1px solid ${C.danger}33`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <Btn
            full variant="primary" size="lg"
            onClick={handleConnect}
            disabled={connecting || installed === null}
          >
            {connecting ? "Confirm in StarKey..." : installed === null ? "Checking for wallet..." : "Connect Wallet"}
          </Btn>

          <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 16, lineHeight: 1.6 }}>
            This only signs a message — it never triggers a transaction or costs gas.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
============================================================ */
export default function App() {
  const { isMobile, isTablet, isDesktop } = useViewport();
  const isCompact = isMobile || isTablet; // shared layout rules for <1080
  const [tab, setTab] = useState("setup");
  const [backendOk, setBackendOk] = useState(true);

  const [session, setSession] = useState(() => getSession());
  const [authReady, setAuthReady] = useState(false);

  const [settings, setSettings] = useState({ niche: "", tone: "technical", audience: "", examples: "", avoid: "", postType: "alpha", customPrompt: "" });
  const [channels, setChannels] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, costPerPost: 1 });
  const [automation, setAutomation] = useState({ running: false, cycleSeconds: 21600, autoApprove: true, nextRunAt: null });
  const [stats, setStats] = useState({ totalGenerations: 0, totalPosts: 0, supraEarned: 0 });

  // ── Posts + history
  const [posts, setPosts] = useState([]);

  // ── Orbit ring (automation countdown)
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState("—");
  const timerRef = useRef(null);

  // ── Generate / Compose page local state
  const [tweet, setTweet] = useState("");
  const [scores, setScores] = useState([]);
  const [genLog, setGenLog] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  function handleSignOut() {
    clearSession();
    setSession(null);
  }

  const refreshAll = useCallback(async () => {
    if (!session) return;
    try {
      const [s, w, a, p, st, ch] = await Promise.all([
        api.get("/settings"), api.get("/wallet"), api.get("/automation"), api.get("/posts"), api.get("/stats"), api.get("/channels"),
      ]);
      if (s.unauthorized) { handleSignOut(); return; }
      // channels API returns an object {id: {...}} — normalise to array for ComposePage
      const channelsArr = Array.isArray(ch) ? ch : Object.values(ch || {});
      setSettings(s); setWallet(w); setAutomation(a); setPosts(p); setStats(st); setChannels(channelsArr);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    refreshAll();
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll, session]);

  /* ── Automation orbit ring ─────────────────────────────── */
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!automation.running || !automation.nextRunAt) {
      setProgress(0); setCountdown("—"); return;
    }
    const tick = () => {
      const now = Date.now();
      const next = new Date(automation.nextRunAt).getTime();
      const total = automation.cycleSeconds * 1000;
      const elapsed = total - (next - now);
      setProgress(Math.max(0, Math.min(1, elapsed / total)));
      setCountdown(fmtCountdown(next - now));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [automation]);

  function updateSetting(key, value) { setSettings((s) => ({ ...s, [key]: value })); }
  async function saveSettings() { const updated = await api.post("/settings", settings); setSettings(updated); }
  async function topUp(amount = 10) { const w = await api.post("/wallet/topup", { amount }); setWallet(w); }
  async function toggleChannel(id, enabled) { const updated = await api.post(`/channels/${id}`, { enabled }); setChannels(Array.isArray(updated) ? updated : Object.values(updated || {})); }
  async function saveChannelCredentials(id, credentials) {
    // saving credentials also auto-enables the channel, so the user doesn't
    // have to save then separately flip the toggle
    const updated = await api.post(`/channels/${id}`, { enabled: true, credentials });
    setChannels(updated);
  }

  /* ── Wallet ────────────────────────────────────────────── */
  async function topUp(n) {
    try { const w = await api.post("/wallet/topup", { amount: n }); setWallet(w); } catch {}
  }

  /* ── Channels ──────────────────────────────────────────── */
  async function onSaveChannel(id, values) {
    try {
      const updated = await api.post(`/channels/${id}`, values);
      setChannels((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {}
  }
  async function onTestChannel(id) {
    try { return await api.post(`/channels/${id}/test`); } catch (err) { return { ok: false, error: err.message }; }
  }

  /* ── Generate ──────────────────────────────────────────── */
  async function handleGenerate(opts = {}) {
    setGenerating(true);
    setGenLog([]);
    setTweet("");
    setScores([]);
    setEditing(false);
    try {
      const data = await api.post("/generate", { autoPost: false, mode: "text", ...opts });
      if (data.ok && data.post) {
        setTweet(data.post.text);
        setEditText(data.post.text);
        if (data.post.scores) setScores(data.post.scores);
        if (data.log) setGenLog(data.log);
        setWallet((w) => ({ ...w, balance: Math.max(0, w.balance - (w.costPerPost || 1)) }));
        setStats((s) => ({ ...s, totalGenerations: (s.totalGenerations || 0) + 1 }));
      } else if (data.log) {
        setGenLog(data.log);
      }
    } catch (err) {
      setGenLog([{ time: new Date().toISOString(), msg: `✕ Error: ${err.message}` }]);
    }
    setGenerating(false);
  }

  /* ── Manual post ───────────────────────────────────────── */
  // payload: { text, imageFilename, mode, targetIds }
  async function onPost(payload) {
    try {
      const result = await api.post("/post", payload);
      if (result.post) setPosts((p) => [result.post, ...p]);
      if (result.ok) setStats((s) => ({ ...s, totalPosts: (s.totalPosts || 0) + 1 }));
      return result;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /* ── Automation ────────────────────────────────────────── */
  async function startAuto() {
    try { const a = await api.post("/automation/start"); setAutomation(a); } catch {}
  }
  async function stopAuto() {
    try { const a = await api.post("/automation/stop"); setAutomation(a); } catch {}
  }
  async function saveAutomationSettings(patch) {
    try { const a = await api.post("/automation/settings", patch); setAutomation(a); } catch {}
  }

  /* ── History ───────────────────────────────────────────── */
  async function clearHistory() {
    try { await api.del("/posts"); setPosts([]); setStats((s) => ({ ...s, totalPosts: 0 })); } catch {}
  }

  const enabledChannelCount = Object.values(channels).filter((c) => c.enabled && c.connected).length;
  const channelGridCols = isMobile ? "1fr" : "1fr 1fr";

  /* ============================================================
     PANEL: SETUP
  ============================================================ */
  const Setup = (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Setup</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>Saved on the server — applies to all automation.</div>
        </div>
      )}

      <Card eyebrow="Identity" title="Account" accentTop={C.accent2}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 4 }}>Signed in with</div>
            <div style={{ fontFamily: C.mono, fontSize: "0.86rem", color: C.text }}>{session?.address}</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Btn>
        </div>
      </Card>

      <Card eyebrow="Status" title="Backend Connection" right={<ConnStatus ok={backendOk} />}>
        <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6 }}>
          {backendOk
            ? "Server is running — settings and history stay saved even if you close this page."
            : "Not connected. Please make sure the SupraPost server is running."}
        </div>
      </Card>

      <Card eyebrow={`Broadcast · ${enabledChannelCount} active`} title="Channels" accentTop={C.accent}>
        <div style={{ display: "grid", gridTemplateColumns: channelGridCols, gap: 10 }}>
          {Object.entries(channels).map(([id, ch]) => (
            <ChannelRow key={id} id={id} channel={ch} onToggle={toggleChannel} onSaveCredentials={saveChannelCredentials} />
          ))}
        </div>
      </Card>

      <Card eyebrow="Payments" title="SUPRA Balance" accentTop={C.supra}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: "1.7rem", color: C.supra, fontWeight: 600 }}>{fmt(wallet.balance)} <span style={{ fontSize: "0.72rem", opacity: 0.7, fontWeight: 400 }}>SUPRA</span></div>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 4 }}>Cost per post: {fmt(wallet.costPerPost)} SUPRA</div>
          </div>
          <Btn variant="supra" onClick={() => setTab("deposit")}>+ Deposit SUPRA</Btn>
        </div>
      </Card>

      <Card eyebrow="Voice & Content" title="Content Profile">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 18px" }}>
          <Field label="Niche / Topic"><Input placeholder="e.g. DeFi, Supra blockchain, trading" value={settings.niche} onChange={(e) => updateSetting("niche", e.target.value)} onBlur={saveSettings} /></Field>
          <Field label="Tone of voice">
            <Select value={settings.tone} onChange={(e) => updateSetting("tone", e.target.value)} onBlur={saveSettings}>
              <option value="technical">Technical & Informative</option>
              <option value="casual">Casual & Engaging</option>
              <option value="hype">Hype & Bullish</option>
              <option value="educational">Educational</option>
              <option value="alpha">Alpha Calls</option>
            </Select>
          </Field>
          <Field label="Target audience"><Input placeholder="e.g. Web3 devs, DeFi traders" value={settings.audience} onChange={(e) => updateSetting("audience", e.target.value)} onBlur={saveSettings} /></Field>
          <Field label="Topics to avoid"><Input placeholder="e.g. politics, price predictions" value={settings.avoid} onChange={(e) => updateSetting("avoid", e.target.value)} onBlur={saveSettings} /></Field>
        </div>
        <Field label="Example posts you like" hint="One per line — helps the AI match your style">
          <TextArea placeholder="Paste 3-5 examples..." value={settings.examples} onChange={(e) => updateSetting("examples", e.target.value)} onBlur={saveSettings} />
        </Field>
        <Btn variant="primary" onClick={saveSettings}>Save profile</Btn>
      </Card>

    </div>
  );

  const Generate = (
    <ComposePage
      isMobile={isMobile}
      wallet={wallet}
      settings={settings}
      updateSetting={updateSetting}
      saveSettings={saveSettings}
      channels={channels}
      generating={generating}
      handleGenerate={handleGenerate}
      tweet={tweet}
      setTweet={setTweet}
      scores={scores}
      genLog={genLog}
      onPost={onPost}
    />
  );

  /* ============================================================
     PANEL: CHANNELS
  ============================================================ */
  const CHANNEL_INFO = {
    telegram:  { name: "Telegram",    icon: "✈",  color: "#34b7eb", fields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF..." },
      { key: "chatId",   label: "Chat ID",   placeholder: "-100123456789" },
    ], helpUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot" },
    discord:   { name: "Discord",     icon: "🎮", color: "#5865F2", fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
    ], helpUrl: "https://support.discord.com/hc/en-us/articles/228383668" },
    twitter:   { name: "Twitter / X", icon: "𝕏",  color: "#1d9bf0", fields: [
      { key: "apiKey",       label: "API Key",             placeholder: "" },
      { key: "apiSecret",    label: "API Secret",          placeholder: "" },
      { key: "accessToken",  label: "Access Token",        placeholder: "" },
      { key: "accessSecret", label: "Access Token Secret", placeholder: "" },
    ], helpUrl: "https://developer.twitter.com/en/portal/dashboard" },
    instagram: { name: "Instagram",   icon: "📷", color: "#E1306C", fields: [
      { key: "accessToken",  label: "Access Token",   placeholder: "" },
      { key: "igUserId",     label: "Account ID",     placeholder: "" },
      { key: "imageBaseUrl", label: "Public Base URL (for images)", placeholder: "https://yourdomain.com" },
    ], helpUrl: "https://developers.facebook.com/docs/instagram-platform" },
  };

  const ChannelsPanel = () => {
    const [expanding, setExpanding] = React.useState(null);
    const [creds, setCreds] = React.useState({});
    const [testResults, setTestResults] = React.useState({});

    const channelIds = Object.keys(CHANNEL_INFO);

    async function saveChannel(id) {
      const info = CHANNEL_INFO[id];
      const credentials = {};
      for (const f of info.fields) credentials[f.key] = creds[id]?.[f.key] || "";
      const updated = await api.post(`/channels/${id}`, { credentials });
      const arr = Array.isArray(updated) ? updated : Object.values(updated || {});
      setChannels(arr);
    }

    async function testChannel(id) {
      const result = await api.post(`/channels/${id}/test`);
      setTestResults((prev) => ({ ...prev, [id]: result }));
    }

    const ch = (id) => channels.find((c) => c.id === id) || {};

    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Channels</div>
            <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>Connect your social networks — credentials stay on the server, never in the browser.</div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
          {channelIds.map((id) => {
            const info = CHANNEL_INFO[id];
            const state = ch(id);
            const open = expanding === id;
            const configured = state.configured;
            const enabled = state.enabled;

            return (
              <Card key={id} accentTop={configured && enabled ? info.color : undefined}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${info.color}1f`,
                      border: `1px solid ${info.color}44`, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{info.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.94rem" }}>{info.name}</div>
                      <div style={{ fontSize: "0.68rem", color: configured && enabled ? C.supra : configured ? C.warn : C.muted, marginTop: 2 }}>
                        {configured && enabled ? "● Active" : configured ? "● Configured · paused" : "○ Not configured"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.74rem", color: C.muted }}>{enabled ? "On" : "Off"}</span>
                    <button onClick={() => toggleChannel(id, !enabled)} style={{
                      width: 42, height: 24, borderRadius: 20, border: `1px solid ${enabled ? info.color : C.border}`,
                      background: enabled ? info.color : C.raised, position: "relative", cursor: "pointer", padding: 0, transition: "all 0.25s",
                    }}>
                      <span style={{ position: "absolute", top: 2, left: enabled ? 20 : 2, width: 18, height: 18,
                        borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                    </button>
                  </div>
                </div>

                {/* Expand/collapse credentials */}
                <button onClick={() => setExpanding(open ? null : id)}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.text2, cursor: "pointer", padding: "8px 12px", fontSize: "0.76rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{configured ? "Update credentials" : "Enter credentials"}</span>
                  <span style={{ color: C.muted }}>{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {info.fields.map((f) => (
                      <Field key={f.key} label={f.label}>
                        <Input
                          type="password"
                          placeholder={f.placeholder || ""}
                          value={creds[id]?.[f.key] || ""}
                          onChange={(e) => setCreds((prev) => ({ ...prev, [id]: { ...prev[id], [f.key]: e.target.value } }))}
                        />
                      </Field>
                    ))}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn variant="primary" size="sm" onClick={() => saveChannel(id)}>Save</Btn>
                      <Btn variant="ghost"   size="sm" onClick={() => testChannel(id)}>Test connection</Btn>
                      {info.helpUrl && (
                        <a href={info.helpUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: "0.7rem", color: C.muted, marginLeft: "auto", alignSelf: "center" }}>
                          How to get credentials ↗
                        </a>
                      )}
                    </div>
                    {testResults[id] && (
                      <div className="pop-in" style={{ fontSize: "0.74rem", padding: "8px 12px", borderRadius: 8,
                        background: testResults[id].ok ? `${C.supra}14` : `${C.danger}14`,
                        border: `1px solid ${testResults[id].ok ? C.supra : C.danger}40`,
                        color: testResults[id].ok ? C.supra : C.danger }}>
                        {testResults[id].ok ? "✓ Test message sent successfully." : `✕ ${testResults[id].error || testResults[id].reason || "Failed"}`}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

      </div>
    );
  };
  const Channels = <ChannelsPanel />;

  /* ============================================================
     PANEL: AUTOMATION
  ============================================================ */
  const Automation = (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Automation</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>The server posts on its own, even with the browser closed.</div>
        </div>
      )}

      <Card style={{ textAlign: "center", padding: isMobile ? "28px 20px" : "36px 20px" }} accentTop={automation.running ? C.accent : undefined}>
        <OrbitRing
          progress={progress}
          running={automation.running}
          size={isMobile ? 150 : 188}
          label={automation.running ? (countdown || "—") : "Stopped"}
          sublabel={automation.running ? "next post in" : "automation inactive"}
        />
        <div style={{ marginTop: 22 }}>
          {!automation.running
            ? <Btn variant="primary" size="lg" onClick={startAuto} disabled={enabledChannelCount === 0}>▶ Start Automation</Btn>
            : <Btn variant="danger" size="lg" onClick={stopAuto}>■ Stop Automation</Btn>}
        </div>
        {enabledChannelCount === 0 && !automation.running && (
          <div style={{ fontSize: "0.7rem", color: C.warn, marginTop: 12 }}>Enable at least one channel in Setup first</div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 13 }}>
        <StatTile label="Auto Posts" value={posts.filter((p) => p.auto).length} color={C.supra} />
        <StatTile label="SUPRA / Cycle" value={fmt(wallet.costPerPost)} color={C.accent} />
        <StatTile label="Total Spent" value={fmt(stats.supraEarned)} color={C.warn} />
        <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 18 }}>
        <Card eyebrow="Schedule" title="Cycle Settings">
          <Field label="Post every">
            <Select value={automation.cycleSeconds} onChange={(e) => saveAutomationSettings({ cycleSeconds: Number(e.target.value) })} disabled={automation.running}>
              <option value={30}>30 seconds (test)</option>
              <option value={3600}>1 hour</option>
              <option value={10800}>3 hours</option>
              <option value={21600}>6 hours</option>
              <option value={43200}>12 hours</option>
              <option value={86400}>24 hours</option>
            </Select>
          </Field>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 15px" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>Auto-approve posts</div>
              <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 3 }}>Publishes without review</div>
            </div>
            <input type="checkbox" checked={automation.autoApprove} onChange={(e) => saveAutomationSettings({ autoApprove: e.target.checked })} style={{ width: 22, height: 22, accentColor: C.accent, cursor: "pointer" }} />
          </div>

          <Field label="Content mode" hint="What each automated cycle will post">
            <Select value={automation.mode || "text"} onChange={(e) => saveAutomationSettings({ mode: e.target.value })} disabled={automation.running}>
              <option value="text">📝 Text Only (AI generated)</option>
              <option value="image">🖼 Image Only (AI generated)</option>
              <option value="both">✦ Text + Image (both AI generated)</option>
            </Select>
          </Field>

          {(automation.mode === "image" || automation.mode === "both") && (
            <Field label="Image style">
              <Select value={automation.imageStyle || "auto"} onChange={(e) => saveAutomationSettings({ imageStyle: e.target.value })} disabled={automation.running}>
                <option value="auto">Auto — AI decides</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="photorealistic">Photorealistic</option>
                <option value="minimal">Minimalist</option>
                <option value="abstract">Abstract</option>
                <option value="infographic">Data / Infographic</option>
                <option value="retro">Retro Futurism</option>
              </Select>
            </Field>
          )}
        </Card>
      </div>
    </div>
  );

  /* ============================================================
     PANEL: HISTORY
  ============================================================ */
  const History = (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {!isMobile && <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>History</div>}
          <div style={{ fontSize: isMobile ? "0.95rem" : "0.85rem", color: isMobile ? C.text : C.muted, fontWeight: isMobile ? 700 : 400, marginTop: isMobile ? 0 : 5 }}>{posts.length} posts total</div>
        </div>
        <Btn variant="danger" size="sm" onClick={clearHistory}>Clear all</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <StatTile label="Total Posts" value={stats.totalPosts} color={C.accent2} />
        <StatTile label="SUPRA Used" value={fmt(stats.supraEarned)} color={C.supra} />
      </div>

      {posts.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48, border: `1.5px dashed ${C.border}`, background: "transparent" }}>
          <div style={{ color: C.muted, fontSize: "0.86rem" }}>No posts yet — generate your first one</div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 13 }}>
          {posts.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 11, flexWrap: "wrap", gap: 6 }}>
                <Pill color={p.auto ? C.accent2 : C.accent}>{p.auto ? "↻ auto" : "✋ manual"}</Pill>
                <span style={{ fontSize: "0.66rem", color: C.muted, fontFamily: C.mono }}>{new Date(p.time).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6, marginBottom: 10 }}>{p.text.substring(0, 160)}{p.text.length > 160 ? "..." : ""}</div>
              {p.results && Object.keys(p.results).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(p.results).map(([id, r]) => (
                    <Pill key={id} color={r.ok ? C.supra : C.warn}>
                      {CHANNEL_ICONS[id] || "●"} {channels[id]?.label || id} {r.ok ? "sent" : "skipped"}
                    </Pill>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const Deposit = (
    <DepositPage
      isMobile={isMobile}
      wallet={wallet}
      walletAddress={session?.address}
      onCredited={refreshAll}
    />
  );

  const panels = { setup: Setup, channels: Channels, compose: Generate, automation: Automation, history: History, deposit: Deposit };

  /* ============================================================
     AUTH GATE — show the wallet sign-in screen until we have a session
  ============================================================ */
  if (!session) {
    return <LoginScreen onSignedIn={setSession} isMobile={isMobile} />;
  }

  /* ============================================================
     LAYOUTS
  ============================================================ */
  if (isMobile) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bgGrad, color: C.text, fontFamily: C.sans }}>
        <GlobalStyle />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,14,26,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: C.display }}>Supra<span style={{ color: C.accent }}>Post</span></div>
          <div style={{ display: "flex", gap: 7 }}>
            <Pill color={C.accent2}>{shortAddress(session?.address)}</Pill>
            <Pill color={C.supra}>⬡ {fmt(wallet.balance)}</Pill>
            <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>{automation.running ? "ON" : "OFF"}</Pill>
          </div>
        </div>

        <div key={tab} className="fade-up" style={{ flex: 1, padding: "18px 16px 96px", overflowY: "auto" }}>
          {panels[tab]}
        </div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(16,14,26,0.9)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {TABS.map(({ id, icon, label }) => (
            <div key={id} onClick={() => setTab(id)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "11px 0 9px", cursor: "pointer",
              color: tab === id ? C.accent : C.muted, borderTop: `2px solid ${tab === id ? C.accent : "transparent"}`, transition: "all 0.2s",
            }}>
              <span style={{ fontSize: "1.2rem" }}>{icon}</span>
              <span style={{ fontSize: "0.62rem", marginTop: 4, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tablet: collapse the 3-column desktop grid into a 2-column layout —
  // top nav bar (icons + labels inline) instead of a sidebar, single content
  // column, no separate right rail (its content folds into Setup/Automation
  // where relevant) to avoid cramming three columns into a narrow viewport.
  if (isTablet) {
    return (
      <div style={{ background: C.bgGrad, color: C.text, minHeight: "100vh", fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
        <GlobalStyle />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,14,26,0.7)", backdropFilter: "blur(10px)" }}>
          <div style={{ fontWeight: 700, fontSize: "1.15rem", fontFamily: C.display }}>Supra<span style={{ color: C.accent }}>Post</span></div>
          <div style={{ display: "flex", gap: 9 }}>
            <ConnStatus ok={backendOk} />
            <Pill color={C.supra}>⬡ {fmt(wallet.balance)}</Pill>
            <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>{automation.running ? "Active" : "Idle"}</Pill>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "12px 24px 0", borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(({ id, icon, label }) => (
            <div key={id} onClick={() => setTab(id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: "10px 10px 0 0", cursor: "pointer",
              fontSize: "0.84rem", fontWeight: 500, color: tab === id ? C.text : C.text2,
              background: tab === id ? C.surface : "transparent",
              borderBottom: tab === id ? `2px solid ${C.accent}` : "2px solid transparent",
            }}>
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>

        <div key={tab} className="fade-up" style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          {panels[tab]}
        </div>
      </div>
    );
  }

  // Desktop: full 3-column layout (sidebar + content + context rail)
  return (
    <div style={{ minHeight: "100dvh", background: C.bgGrad, color: C.text, fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
      <GlobalStyle />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,14,26,0.6)", backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", fontFamily: C.display, letterSpacing: "-0.01em" }}>Supra<span style={{ color: C.accent }}>Post</span></div>
          <span style={{ fontSize: "0.74rem", color: C.muted, borderLeft: `1px solid ${C.border}`, paddingLeft: 14 }}>AI Social Automation</span>
        </div>
        <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
          <ConnStatus ok={backendOk} />
          <Pill color={C.supra}>⬡ {fmt(wallet.balance)} SUPRA</Pill>
          <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>{automation.running ? "Automation active" : "Idle"}</Pill>
          <Pill color={C.accent2}>{shortAddress(session?.address)}</Pill>
          <Btn variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "252px 1fr 296px", flex: 1, minHeight: 0 }}>
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
          {TABS.map(({ id, icon, label }) => (
            <div key={id} onClick={() => setTab(id)} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 10, cursor: "pointer",
              fontSize: "0.88rem", fontWeight: 500, color: tab === id ? C.text : C.text2,
              background: tab === id ? `linear-gradient(135deg, ${C.accent}26, ${C.accent}0d)` : "transparent",
              border: `1px solid ${tab === id ? C.accent + "40" : "transparent"}`, transition: "all 0.18s",
            }}>
              <span style={{ fontSize: "1.05rem", width: 18, textAlign: "center" }}>{icon}</span> {label}
            </div>
          ))}

          <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "24px 14px 9px" }}>Wallet</div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Balance</div>
            <div style={{ fontFamily: C.mono, fontSize: "1.5rem", color: C.supra, fontWeight: 600, marginTop: 5 }}>{fmt(wallet.balance)}</div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>SUPRA tokens</div>
            <Btn full variant="supra" size="sm" style={{ marginTop: 12 }} onClick={() => setTab("deposit")}>Deposit SUPRA</Btn>
          </Card>

          <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "18px 14px 9px" }}>Channels</div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontFamily: C.mono, fontSize: "1.15rem", color: C.accent, fontWeight: 600 }}>{enabledChannelCount} active</div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>of {Object.keys(channels).length} platforms</div>
          </Card>
        </div>

        <div key={tab} className="fade-up" style={{ overflowY: "auto", padding: 32 }}>
          {panels[tab]}
        </div>

        <div style={{ borderLeft: `1px solid ${C.border}`, padding: 22, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <StatTile label="Posts" value={stats.totalPosts} color={C.accent} />
            <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
          </div>

          <div style={{ height: 1, background: C.border, margin: "5px 0" }} />

          <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Active Profile</div>
          <Card>
            {[["Niche", settings.niche || "—"], ["Tone", settings.tone], ["Audience", settings.audience || "—"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9, gap: 8 }}>
                <span style={{ fontSize: "0.74rem", color: C.muted, flexShrink: 0 }}>{l}</span>
                <span style={{ fontSize: "0.74rem", color: C.text, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </Card>

          {posts.length > 0 && (
            <>
              <div style={{ height: 1, background: C.border, margin: "5px 0" }} />
              <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Latest Post</div>
              <Card style={{ fontSize: "0.76rem", color: C.text2, lineHeight: 1.6 }}>
                {posts[0].text.substring(0, 110)}{posts[0].text.length > 110 ? "..." : ""}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
