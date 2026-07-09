import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "./theme";
import { isStarKeyInstalled, waitForStarKey, signInWithWallet, getSession, clearSession, shortAddress } from "./wallet";
import { ComposePage } from "./pages/ComposePage";
import { ReferralPage } from "./pages/ReferralPage";
import { AdminPage } from "./pages/AdminPage";
import { ChannelsPanel } from "./pages/ChannelsPage";
import { LandingPage } from "./pages/LandingPage";
import { depositSupra } from "./payment";

// === CONFIGURAÇÃO API (FIX PARA VERCEL + TUNNEL) ===
const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const TABS = [
  { id: "setup",      icon: "⚙",  label: "Setup" },
  { id: "channels",   icon: "📡", label: "Channels" },
  { id: "compose",    icon: "✦",  label: "Compose" },
  { id: "automation", icon: "⚡", label: "Automation" },
  { id: "history",    icon: "📋", label: "History" },
  { id: "referral",   icon: "⬡",  label: "Referrals" },
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

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

// API com suporte a backend separado
const api = {
  async get(path) {
    const res = await fetch(`${apiBase}/api${path}`, { headers: { ...authHeaders() } });
    if (res.status === 401) return { unauthorized: true };
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${apiBase}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    });
    if (res.status === 401) return { unauthorized: true };
    return res.json();
  },
  async del(path) {
    const res = await fetch(`${apiBase}/api${path}`, { method: "DELETE", headers: { ...authHeaders() } });
    if (res.status === 401) return { unauthorized: true };
    return res.json();
  },
};

function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width: w, isMobile: w < 700, isTablet: w >= 700 && w < 1080, isDesktop: w >= 1080 };
}

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      background: #080b12;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }

    /* Reset */
    input, select, textarea, button { font-family: inherit; }
    input::placeholder, textarea::placeholder { color: ${C.muted}; opacity: 1; }
    input:focus, textarea:focus, select:focus { outline: none; }
    button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
    a { color: inherit; text-decoration: none; }

    /* Animations */
    @keyframes softPulse { 0%,100% { opacity:1; transform:scale(1) }   50% { opacity:.5; transform:scale(.88) } }
    @keyframes fadeUp    { from { opacity:0; transform:translateY(6px) }  to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn    { from { opacity:0 }                             to { opacity:1 } }
    @keyframes scaleIn   { from { opacity:0; transform:scale(0.97) }      to { opacity:1; transform:scale(1) } }
    @keyframes toastIn   { from { opacity:0; transform:translateY(8px) }  to { opacity:1; transform:translateY(0) } }

    .fade-up  { animation: fadeUp  0.22s cubic-bezier(.16,.84,.44,1) both }
    .scale-in { animation: scaleIn 0.18s cubic-bezier(.16,.84,.44,1) both }
    .fade-in  { animation: fadeIn  0.18s ease both }

    /* Mobile */
    @media (max-width: 699px) {
      body { font-size: 13px; }
      input[type="text"], input[type="number"], input[type="password"],
      input[type="email"], input[type="search"], select, textarea {
        font-size: 16px !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }
  `}</style>
);

/* Resto do ficheiro igual ao teu original */
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: C.surface2, border: `1px solid ${C.supra}44`, borderRadius: 12,
      padding: "10px 20px", fontSize: "0.8rem", color: C.supra, fontWeight: 600,
      boxShadow: `0 8px 24px -8px ${C.supra}44`, zIndex: 9999,
      animation: "toastIn 0.28s cubic-bezier(.2,.8,.2,1) both",
      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
    }}>
      <span>✓</span> {message}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg) => setToast(msg);
  const hide = () => setToast(null);
  const el = toast ? <Toast message={toast} onDone={hide} /> : null;
  return [show, el];
}

/* ── OrbitRing ───────────────────────────────────────────────────────────── */
function OrbitRing({ progress = 0, running, size = 168, label, sublabel }) {
  const stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={running ? C.accent : C.muted} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1), stroke 0.4s" }} />
        {running && (
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.accent} strokeWidth={stroke}
            strokeDasharray={`1 ${c-1}`} strokeLinecap="round"
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

/* ── Primitives ──────────────────────────────────────────────────────────── */
function Btn({ onClick, variant = "ghost", children, disabled, full, size = "md", style }) {
  const palettes = {
    primary: { bg: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`, fg: "#fff", border: "transparent", shadow: `0 4px 16px -4px ${C.accent}66` },
    supra: { bg: "rgba(61,220,145,0.12)", fg: C.supra, border: "rgba(61,220,145,0.32)" },
    danger: { bg: "rgba(255,107,129,0.12)", fg: C.danger, border: "rgba(255,107,129,0.32)" },
    ghost: { bg: C.raised, fg: C.text, border: C.borderLight },
    cyan: { bg: "rgba(62,217,208,0.12)", fg: C.accent2, border: "rgba(62,217,208,0.32)" },
    warn: { bg: "rgba(255,181,71,0.12)", fg: C.warn, border: "rgba(255,181,71,0.32)" },
  };
  const p = palettes[variant] || palettes.ghost;
  const sizes = { sm: "7px 13px", md: "10px 18px", lg: "13px 24px" };
  const fsizes = { sm: "0.76rem", md: "0.84rem", lg: "0.92rem" };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: p.bg, color: p.fg, border: `1px solid ${p.border}`,
      borderRadius: 10, padding: sizes[size], fontSize: fsizes[size], fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      width: full ? "100%" : "auto", fontFamily: C.sans,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      transition: "filter 0.15s, transform 0.12s, box-shadow 0.2s", whiteSpace: "nowrap",
      boxShadow: p.shadow || "none", ...style,
    }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "scale(1)"; }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >{children}</button>
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
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${C.accent},${C.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: "#fff", fontFamily: C.display }}>S</div>
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
    <div ref={ref} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 13, fontFamily: C.mono, fontSize: "0.72rem", lineHeight: 1.95, maxHeight: 180, overflowY: "auto" }}>
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
    <div style={{ background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontFamily: C.mono, fontSize: "1.7rem", fontWeight: 600, color, lineHeight: 1 }}>
        {value}{suffix && <span style={{ fontSize: "0.9rem", opacity: 0.6 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: "0.67rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 7 }}>{label}</div>
    </div>
  );
}

const CHANNEL_ICONS = { telegram: "✈", twitter: "𝕏", instagram: "◫", discord: "◆" };

/* ── Low Balance Banner ──────────────────────────────────────────────────── */
function LowBalanceBanner({ balance, costPerPost, onDeposit }) {
  if (balance > costPerPost * 3) return null;
  const critical = balance < costPerPost;
  const postsLeft = Math.floor(balance / costPerPost);
  const color = critical ? C.danger : C.warn;
  return (
    <div className="fade-up" style={{
      background: critical ? `${C.danger}10` : `${C.warn}10`,
      borderBottom: `1px solid ${color}33`,
      padding: "9px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
      position: "sticky", top: 0, zIndex: 110,
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.9rem" }}>{critical ? "⛔" : "⚠️"}</span>
        <div>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color }}>
            {critical
              ? "Insufficient balance — automation has stopped"
              : `Low balance — ${postsLeft} post${postsLeft !== 1 ? "s" : ""} remaining`}
          </span>
          <span style={{ fontSize: "0.74rem", color: C.muted, marginLeft: 8 }}>
            {fmt(balance)} SUPRA
          </span>
        </div>
      </div>
      <button onClick={onDeposit} style={{
        all: "unset", cursor: "pointer",
        padding: "5px 14px", borderRadius: 8,
        fontSize: "0.76rem", fontWeight: 700,
        background: color, color: critical ? "#fff" : "#1a0a00",
        transition: "filter 0.15s",
      }}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.12)"}
        onMouseLeave={e => e.currentTarget.style.filter = "none"}
      >
        Deposit SUPRA →
      </button>
    </div>
  );
}

/* ── Onboarding Checklist ────────────────────────────────────────────────── */
function OnboardingChecklist({ settings, channels, wallet, onNavigate }) {
  const hasProfile = !!(settings.niche && settings.tone);
  const hasChannel = channels.some(c => c.configured && c.enabled);
  const hasBalance = (wallet.balance + (wallet.creditBalance || 0)) >= wallet.costPerPost;
  const allDone = hasProfile && hasChannel && hasBalance;

  // Dismiss permanently once all steps are done
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("suprapost_onboarding_done") === "1"; } catch { return false; }
  });

  if (allDone && !dismissed) {
    localStorage.setItem("suprapost_onboarding_done", "1");
  }
  if (dismissed || allDone) return null;

  const steps = [
    {
      done: hasProfile,
      icon: "✦",
      label: "Set up your content profile",
      sub: "Define your niche, tone, and audience",
      action: null,
    },
    {
      done: hasChannel,
      icon: "📡",
      label: "Connect a channel",
      sub: "Telegram, Discord, Twitter or Instagram",
      action: () => onNavigate("channels"),
    },
    {
      done: hasBalance,
      icon: "⬡",
      label: "Deposit SUPRA",
      sub: "1 SUPRA per post — top up anytime",
      action: () => onNavigate("setup"),
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="fade-up" style={{
      background: `linear-gradient(135deg, ${C.accent}0a, ${C.supra}08)`,
      border: `1px solid ${C.accent}33`,
      borderRadius: 14, padding: "16px 18px", marginBottom: 0,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: C.display, color: C.text }}>
            Get started — {doneCount} of {steps.length} done
          </div>
          <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2 }}>
            Complete these steps to start publishing automatically
          </div>
        </div>
        <span style={{ fontSize: "0.76rem", fontWeight: 700, color: C.accent, fontFamily: C.mono }}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: C.border, borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${C.accent}, ${C.supra})`,
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 9,
            background: s.done ? `${C.supra}0a` : C.raised,
            border: `1px solid ${s.done ? C.supra + "33" : C.border}`,
            opacity: s.done ? 0.65 : 1,
            transition: "all 0.3s",
          }}>
            {/* Circle */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: s.done ? `${C.supra}22` : C.surface,
              border: `1.5px solid ${s.done ? C.supra : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: s.done ? "0.72rem" : "0.85rem",
              color: s.done ? C.supra : C.text2,
              transition: "all 0.3s",
            }}>
              {s.done ? "✓" : s.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "0.82rem", fontWeight: 600,
                color: s.done ? C.muted : C.text,
                textDecoration: s.done ? "line-through" : "none",
              }}>{s.label}</div>
              {!s.done && (
                <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 1 }}>{s.sub}</div>
              )}
            </div>

            {/* CTA */}
            {!s.done && s.action && (
              <button onClick={s.action} style={{
                all: "unset", cursor: "pointer",
                padding: "5px 12px", borderRadius: 7,
                fontSize: "0.74rem", fontWeight: 700,
                background: `${C.accent}18`,
                color: C.accent,
                border: `1px solid ${C.accent}44`,
                whiteSpace: "nowrap", flexShrink: 0,
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}28`}
                onMouseLeave={e => e.currentTarget.style.background = `${C.accent}18`}
              >Set up →</button>
            )}
            {!s.done && !s.action && (
              <span style={{ fontSize: "0.7rem", color: C.muted, fontStyle: "italic", flexShrink: 0 }}>this tab</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Deposit History ─────────────────────────────────────────────────────── */
function DepositHistory() {
  const [deposits, setDeposits] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const session = getSession();
      const res = await fetch("/api/wallet/deposits", {
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
      });
      const data = await res.json();
      setDeposits(data.ok ? data.deposits : []);
    } catch { setDeposits([]); }
  }

  function toggle() { if (!open && deposits === null) load(); setOpen(o => !o); }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function shortHash(h) { if (!h) return "—"; return h.slice(0, 8) + "…" + h.slice(-6); }

  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
      <button onClick={toggle} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: C.text2, fontWeight: 500 }}>
        <span style={{ fontSize: "0.68rem", color: C.muted }}>📋</span>
        Deposit history
        <span style={{ fontSize: "0.62rem", color: C.muted, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }} className="fade-up">
          {deposits === null && <div style={{ fontSize: "0.73rem", color: C.muted }}>Loading…</div>}
          {deposits !== null && deposits.length === 0 && <div style={{ fontSize: "0.73rem", color: C.muted }}>No deposits yet.</div>}
          {deposits !== null && deposits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {deposits.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.raised, borderRadius: 8, padding: "8px 12px", fontSize: "0.73rem" }}>
                  <div>
                    <span style={{ color: C.supra, fontWeight: 600 }}>+{d.amount} SUPRA</span>
                    <span style={{ color: C.muted, marginLeft: 10 }}>{fmtDate(d.createdAt)}</span>
                  </div>
                  {d.txHash ? (
                    <a href={`https://suprascan.io/tx/${d.txHash.replace("0x", "")}`} target="_blank" rel="noreferrer"
                      style={{ color: C.accent2, textDecoration: "none", fontFamily: C.mono, fontSize: "0.68rem" }} title={d.txHash}>
                      {shortHash(d.txHash)} ↗
                    </a>
                  ) : <span style={{ color: C.muted, fontFamily: C.mono, fontSize: "0.68rem" }}>—</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ── DepositHistoryFull — for History tab ────────────────────────────────── */
function DepositHistoryFull() {
  const [deposits, setDeposits] = useState(null);

  useEffect(() => {
    const session = getSession();
    fetch("/api/wallet/deposits", { headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {} })
      .then(r => r.json())
      .then(d => setDeposits(d.ok ? d.deposits : []))
      .catch(() => setDeposits([]));
  }, []);

  if (deposits === null) return <div style={{ fontSize: "0.8rem", color: C.muted, padding: 20 }}>Loading…</div>;
  if (deposits.length === 0) return (
    <Card style={{ textAlign: "center", padding: 48, border: `1.5px dashed ${C.border}`, background: "transparent" }}>
      <div style={{ color: C.muted, fontSize: "0.86rem" }}>No deposits yet</div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {deposits.map(d => (
        <Card key={d.id} style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span style={{ color: C.supra, fontWeight: 700, fontSize: "1rem", fontFamily: C.mono }}>+{d.amount} SUPRA</span>
              <span style={{ color: C.muted, fontSize: "0.72rem", marginLeft: 12 }}>
                {new Date(d.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {d.txHash ? (
              <a href={`https://suprascan.io/tx/${d.txHash.replace("0x","")}`} target="_blank" rel="noreferrer"
                style={{ color: C.accent2, textDecoration: "none", fontFamily: C.mono, fontSize: "0.72rem" }}>
                {d.txHash.slice(0,10)}…{d.txHash.slice(-6)} ↗
              </a>
            ) : <span style={{ color: C.muted, fontSize: "0.72rem" }}>—</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── Login Screen ────────────────────────────────────────────────────────── */
function LoginScreen({ onSignedIn, isMobile }) {
  const [installed, setInstalled] = useState(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    waitForStarKey(3000).then(ok => setInstalled(ok)).catch(() => setInstalled(false));
  }, []);

  async function handleSignIn() {
    setSigning(true); setError("");
    try {
      const session = await signInWithWallet();
      onSignedIn(session);
    } catch (e) {
      setError(e.message || "Sign-in failed — try again");
    }
    setSigning(false);
  }

  return (
    <div style={{
      minHeight: "100dvh", background: C.bgGrad, color: C.text,
      fontFamily: C.sans, display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px 20px",
    }}>
      <GlobalStyle />
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15,
            background: `${C.accent}14`,
            border: `0.5px solid ${C.accent}33`,
            margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem",
          }}>⬡</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: C.display, letterSpacing: "-0.03em" }}>
            Supra<span style={{ color: C.accent }}>Post</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 6, letterSpacing: "0.04em" }}>
            AI Social Automation
          </div>
        </div>

        {/* Card */}
        <Card>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 6, color: C.text }}>
            Sign in with StarKey
          </div>
          <div style={{ fontSize: "0.78rem", color: C.text2, lineHeight: 1.65, marginBottom: 22 }}>
            No password, no email — your wallet is your account.
          </div>

          {installed === false && (
            <div style={{
              fontSize: "0.74rem", color: C.warn,
              background: `${C.warn}0e`, border: `0.5px solid ${C.warn}30`,
              borderRadius: 8, padding: "10px 13px", marginBottom: 14, lineHeight: 1.6,
            }}>
              StarKey not detected —{" "}
              <a href="https://starkey.app" target="_blank" rel="noreferrer"
                style={{ color: C.warn, textDecoration: "underline" }}>
                install here
              </a>
            </div>
          )}

          {error && (
            <div style={{
              fontSize: "0.74rem", color: C.danger,
              background: `${C.danger}0e`, border: `0.5px solid ${C.danger}30`,
              borderRadius: 8, padding: "10px 13px", marginBottom: 14,
            }}>{error}</div>
          )}

          <Btn variant="primary" full size="lg" onClick={handleSignIn} disabled={signing || installed === false}>
            {signing ? "Signing in…" : "Connect wallet"}
          </Btn>
        </Card>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: "0.68rem", color: C.muted }}>
          Powered by Supra blockchain
        </div>
      </div>
    </div>
  );
}


/* ── ReferralCard ────────────────────────────────────────────────────────── */
function ReferralCard({ walletAddress }) {
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    fetch("/api/referral", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.ok) setStats(d); })
      .catch(() => {});
  }, [walletAddress]);

  const refLink = walletAddress
    ? `${window.location.origin}/?ref=0x${walletAddress.replace(/^0x/, "")}`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card eyebrow="Referrals" title="Earn SUPRA" accentTop={C.accent}>
      <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6, marginBottom: 14 }}>
        Share your link. Every time someone you referred deposits SUPRA, you automatically earn <strong style={{ color: C.supra }}>10% commission</strong> — forever.
      </div>

      {/* Referral link */}
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: "10px 14px", display: "flex", alignItems: "center",
        gap: 10, marginBottom: 14,
      }}>
        <span style={{
          flex: 1, fontFamily: C.mono, fontSize: "0.72rem", color: C.muted,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{refLink || "Sign in to get your link"}</span>
        <button onClick={copyLink} disabled={!refLink} style={{
          all: "unset", cursor: refLink ? "pointer" : "not-allowed",
          padding: "5px 14px", borderRadius: 7, flexShrink: 0,
          fontSize: "0.76rem", fontWeight: 700,
          background: copied ? `${C.supra}20` : `${C.accent}18`,
          color: copied ? C.supra : C.accent,
          border: `1px solid ${copied ? C.supra + "44" : C.accent + "44"}`,
          transition: "all 0.2s",
        }}>
          {copied ? "✓ Copied!" : "Copy link"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{
            flex: 1, background: C.raised, border: `1px solid ${C.border}`,
            borderRadius: 9, padding: "10px 12px", textAlign: "center",
          }}>
            <div style={{ fontFamily: C.mono, fontSize: "1.2rem", fontWeight: 700, color: C.text }}>
              {stats.referralCount}
            </div>
            <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>Users referred</div>
          </div>
          <div style={{
            flex: 1, background: C.raised, border: `1px solid ${C.border}`,
            borderRadius: 9, padding: "10px 12px", textAlign: "center",
          }}>
            <div style={{ fontFamily: C.mono, fontSize: "1.2rem", fontWeight: 700, color: C.supra }}>
              {fmt(stats.referralEarned)}
            </div>
            <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>SUPRA earned</div>
          </div>
          {stats.referredBy && (
            <div style={{
              flex: 1, background: C.raised, border: `1px solid ${C.border}`,
              borderRadius: 9, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontFamily: C.mono, fontSize: "0.7rem", fontWeight: 600, color: C.accent2, wordBreak: "break-all" }}>
                {stats.referredBy.slice(0, 8)}...
              </div>
              <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>Your referrer</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── TopUpFlow ───────────────────────────────────────────────────────────── */
function TopUpFlow({ walletAddress, onCredited }) {
  const [amount, setAmount] = useState(10);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [done, setDone] = useState(false);

  async function handleDeposit() {
    setError(""); setTxHash(""); setDone(false);
    const result = await depositSupra(walletAddress, Number(amount), setStatus);
    setStatus(null);
    if (result.ok) {
      setDone(true);
      if (result.txHash) setTxHash(result.txHash);
      onCredited?.();
    } else {
      setError(result.error || "Deposit failed");
      if (result.txHash) setTxHash(result.txHash);
    }
  }

  function reset() { setDone(false); setError(""); setStatus(null); setTxHash(""); }

  if (done) {
    return (
      <div className="scale-in">
        <div style={{ fontSize: "0.84rem", color: C.supra, fontWeight: 600, marginBottom: 10 }}>
          ✓ {amount} SUPRA credited successfully
        </div>
        {txHash && (
          <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: 10 }}>
            TX: <a href={`https://suprascan.io/tx/${txHash.replace("0x","")}`} target="_blank" rel="noreferrer" style={{ color: C.accent2 }}>{txHash.slice(0, 22)}…</a>
          </div>
        )}
        <Btn variant="ghost" size="sm" onClick={reset}>Make another deposit</Btn>
        <DepositHistory />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Input type="number" min="1" value={amount}
          onChange={(e) => setAmount(e.target.value)} style={{ flex: 1 }} disabled={!!status} />
        <Btn variant="supra" onClick={handleDeposit} disabled={!!status}>
          {status ? "…" : "Deposit SUPRA"}
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
          {txHash && <div style={{ marginTop: 4, color: C.muted }}>TX sent: {txHash.slice(0, 20)}… (contact support)</div>}
        </div>
      )}
      <DepositHistory />
    </div>
  );
}

/* ── Main App ────────────────────────────────────────────────────────────── */
export default function App() {
  const { isMobile, isTablet, isDesktop } = useViewport();
  const isCompact = isMobile || isTablet;
  const [tab, setTab] = useState("setup");
  const [session, setSession] = useState(() => getSession());
  const [showLanding, setShowLanding] = useState(() => !getSession());

  const [settings, setSettings] = useState({ niche: "", tone: "technical", audience: "", examples: "", avoid: "", postType: "alpha", customPrompt: "" });
  const editingRef = useRef(false); // true while user is typing in any field
  const [channels, setChannels] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, costPerPost: 1 });
  const [automation, setAutomation] = useState({ running: false, cycleSeconds: 21600, autoApprove: true, nextRunAt: null });
  const [stats, setStats] = useState({ totalGenerations: 0, totalPosts: 0, supraEarned: 0 });
  const [posts, setPosts] = useState([]);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState("—");
  const timerRef = useRef(null);

  const [tweet, setTweet] = useState("");
  const [scores, setScores] = useState([]);
  const [genLog, setGenLog] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [showToast, toastEl] = useToast();

  function handleSignOut() { clearSession(); setSession(null); }

  const refreshAll = useCallback(async () => {
    if (!session) return;
    try {
      const [s, w, a, p, st, pr] = await Promise.all([
        api.get("/settings"), api.get("/wallet"), api.get("/automation"), api.get("/posts"), api.get("/stats"),
        fetch("/api/pricing").then(r => r.json()).catch(() => ({ ok: false })),
      ]);
      if (s.unauthorized) { handleSignOut(); return; }
      if (!editingRef.current) setSettings(s);
      setWallet(w); setAutomation(a); setPosts(p); setStats(st);
      if (pr?.ok) setPricing(pr.pricing);
    } catch {}
  }, [session]);

  useEffect(() => {
    if (!session) return;
    // Load channels only once — not part of polling
    // so we don't interfere with the user typing credentials
    api.get("/channels").then(ch => {
      const arr = Array.isArray(ch) ? ch : Object.values(ch || {});
      setChannels(arr);
    }).catch(() => {});
    refreshAll();
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!automation.running || !automation.nextRunAt) { setProgress(0); setCountdown("—"); return; }
    const tick = () => {
      const now = Date.now(), next = new Date(automation.nextRunAt).getTime();
      const total = automation.cycleSeconds * 1000, elapsed = total - (next - now);
      setProgress(Math.max(0, Math.min(1, elapsed / total)));
      setCountdown(fmtCountdown(next - now));
    };
    tick(); timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [automation]);

  function updateSetting(key, value) {
    editingRef.current = true;
    setSettings(s => ({ ...s, [key]: value }));
  }

  async function saveSettings() {
    const updated = await api.post("/settings", settings);
    editingRef.current = false;
    setSettings(updated);
    showToast("Profile saved ✓");
  }

  async function toggleChannel(id, enabled) {
    const updated = await api.post(`/channels/${id}`, { enabled });
    setChannels(Array.isArray(updated) ? updated : Object.values(updated || {}));
  }

  async function onSaveChannel(id, values) {
    try {
      const updated = await api.post(`/channels/${id}`, values);
      setChannels(Array.isArray(updated) ? updated : Object.values(updated || {}));
    } catch {}
  }

  async function onTestChannel(id) {
    try { return await api.post(`/channels/${id}/test`); }
    catch (err) { return { ok: false, error: err.message }; }
  }

  async function handleGenerate(opts = {}) {
    setGenerating(true); setGenLog([]); setTweet(""); setScores([]);
    try {
      const data = await api.post("/generate", { autoPost: false, mode: "text", ...opts });
      if (data.ok && data.post) {
        setTweet(data.post.text);
        if (data.post.scores) setScores(data.post.scores);
        if (data.log) setGenLog(data.log);
        setWallet(w => ({ ...w, balance: Math.max(0, w.balance - (w.costPerPost || 1)) }));
        setStats(s => ({ ...s, totalGenerations: (s.totalGenerations || 0) + 1 }));
      } else if (data.log) setGenLog(data.log);
    } catch (err) { setGenLog([{ time: new Date().toISOString(), msg: `✕ Error: ${err.message}` }]); }
    setGenerating(false);
  }

  async function onPost(payload) {
    try {
      const result = await api.post("/post", payload);
      if (result.post) setPosts(p => [result.post, ...p]);
      if (result.ok) setStats(s => ({ ...s, totalPosts: (s.totalPosts || 0) + 1 }));
      return result;
    } catch (err) { return { ok: false, error: err.message }; }
  }

  async function startAuto() {
    try { const a = await api.post("/automation/start"); setAutomation(a); } catch {}
  }
  async function stopAuto() {
    try { const a = await api.post("/automation/stop"); setAutomation(a); } catch {}
  }
  async function saveAutomationSettings(patch) {
    try { const a = await api.post("/automation/settings", patch); setAutomation(a); } catch {}
  }
  async function clearHistory() {
    try { await api.del("/posts"); setPosts([]); setStats(s => ({ ...s, totalPosts: 0 })); } catch {}
  }

  const enabledChannelCount = channels.filter(c => c.enabled && c.connected).length;

  /* ── Panels ──────────────────────────────────────────────────────────── */

  // ── Setup
  const Setup = (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Setup</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>Define your style, niche and content preferences.</div>
        </div>
      )}

      <OnboardingChecklist
        settings={settings} channels={channels} wallet={wallet}
        onNavigate={setTab}
      />

      <Card eyebrow="Identity" title="Account" accentTop={C.accent2}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 4 }}>Signed in with</div>
            <div style={{ fontFamily: C.mono, fontSize: "0.86rem", color: C.text }} title={session?.address}>
              {shortAddress(session?.address)}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Btn>
        </div>
      </Card>

      <Card id="deposit-section" eyebrow="Payments" title="SUPRA Balance" accentTop={C.supra}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: C.mono, fontSize: "1.7rem", color: C.supra, fontWeight: 600 }}>
            {fmt(wallet.balance + (wallet.creditBalance || 0))} <span style={{ fontSize: "0.72rem", opacity: 0.7, fontWeight: 400 }}>SUPRA</span>
          </div>
          <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 4 }}>1 SUPRA per post</div>
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 16 }} />
        <TopUpFlow walletAddress={session?.address} onCredited={refreshAll} />
        <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
          Your balance is held on the platform and debited for each post.
        </div>
      </Card>

      <Card eyebrow="Voice & Content" title="Content Profile">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 18px" }}>
          <Field label="Niche / Topic"><Input placeholder="e.g. DeFi, Supra blockchain, trading" value={settings.niche} onChange={e => updateSetting("niche", e.target.value)} onBlur={saveSettings} /></Field>
          <Field label="Tone of voice">
            <Select value={settings.tone} onChange={e => updateSetting("tone", e.target.value)} onBlur={saveSettings}>
              <option value="technical">Technical & Informative</option>
              <option value="casual">Casual & Engaging</option>
              <option value="hype">Hype & Bullish</option>
              <option value="educational">Educational</option>
              <option value="alpha">Alpha Calls</option>
            </Select>
          </Field>
          <Field label="Target audience"><Input placeholder="e.g. Web3 devs, DeFi traders" value={settings.audience} onChange={e => updateSetting("audience", e.target.value)} onBlur={saveSettings} /></Field>
          <Field label="Topics to avoid"><Input placeholder="e.g. politics, price predictions" value={settings.avoid} onChange={e => updateSetting("avoid", e.target.value)} onBlur={saveSettings} /></Field>
        </div>
        <Field label="Example posts you like" hint="One per line — helps the AI match your style">
          <TextArea placeholder="Paste 3-5 examples…" value={settings.examples} onChange={e => updateSetting("examples", e.target.value)} onBlur={saveSettings} />
        </Field>
        <Btn variant="primary" onClick={saveSettings}>Save profile</Btn>
      </Card>
    </div>
  );

  const Channels = (
    <ChannelsPanel
      isMobile={isMobile}
      isCompact={isCompact}
      channels={channels}
      onSave={onSaveChannel}
      onToggle={toggleChannel}
      onTest={onTestChannel}
    />
  );

  // ── Automation
  const hasChannels = enabledChannelCount > 0;

  const Automation = (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Automation</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>Posts on its own — even when you close this page.</div>
        </div>
      )}


      <Card style={{ textAlign: "center", padding: isMobile ? "28px 20px" : "36px 20px" }} accentTop={automation.running ? C.accent : undefined}>
        <OrbitRing progress={progress} running={automation.running} size={isMobile ? 150 : 188}
          label={automation.running ? (countdown || "—") : "Stopped"}
          sublabel={automation.running ? "next post in" : "automation inactive"} />
        <div style={{ marginTop: 22 }}>
          {!automation.running
            ? (hasChannels
                ? <Btn variant="primary" size="lg" onClick={startAuto}>▶ Start Automation</Btn>
                : <Btn variant="ghost" size="lg" onClick={() => setTab("channels")}>Configure channels first →</Btn>
              )
            : <Btn variant="danger" size="lg" onClick={stopAuto}>■ Stop Automation</Btn>}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 13 }}>
        <StatTile label="Auto Posts" value={posts.filter(p => p.auto).length} color={C.supra} />
        <StatTile label="SUPRA / Cycle" value={fmt(wallet.costPerPost)} color={C.accent} />
        <StatTile label="Total Spent" value={fmt(stats.supraEarned)} color={C.warn} />
        <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 18 }}>
        <Card eyebrow="Schedule" title="Cycle Settings">
          <Field label="Post every">
            <Select value={automation.cycleSeconds} onChange={e => saveAutomationSettings({ cycleSeconds: Number(e.target.value) })} disabled={automation.running}>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={600}>10 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={1800}>30 minutes</option>
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
            <input type="checkbox" checked={automation.autoApprove} onChange={e => saveAutomationSettings({ autoApprove: e.target.checked })} style={{ width: 22, height: 22, accentColor: C.accent, cursor: "pointer" }} />
          </div>
          <Field label="Content mode" hint="What each automated cycle will post">
            <Select value={automation.mode || "text"} onChange={e => saveAutomationSettings({ mode: e.target.value })} disabled={automation.running}>
              <option value="text">📝 Text Only (AI generated)</option>
              <option value="image">🖼 Image Only (AI generated)</option>
              <option value="both">✦ Text + Image (both AI generated)</option>
            </Select>
          </Field>
          {(automation.mode === "image" || automation.mode === "both") && (
            <Field label="Image style">
              <Select value={automation.imageStyle || "auto"} onChange={e => saveAutomationSettings({ imageStyle: e.target.value })} disabled={automation.running}>
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

  // ── History (with deposit history tab)
  const [historyTab, setHistoryTab] = useState("posts");

  const History = (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {!isMobile && <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>History</div>}
          <div style={{ fontSize: isMobile ? "0.95rem" : "0.85rem", color: isMobile ? C.text : C.muted, fontWeight: isMobile ? 700 : 400, marginTop: isMobile ? 0 : 5 }}>{posts.length} total posts</div>
        </div>
        {historyTab === "posts" && <Btn variant="danger" size="sm" onClick={clearHistory}>Clear all</Btn>}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {[["posts", "📝 Posts"], ["deposits", "💳 Deposits"]].map(([id, label]) => (
          <button key={id} onClick={() => setHistoryTab(id)} style={{ all: "unset", cursor: "pointer", padding: "8px 16px", fontSize: "0.8rem", fontWeight: 600, color: historyTab === id ? C.text : C.muted, borderBottom: `2px solid ${historyTab === id ? C.accent : "transparent"}`, transition: "all 0.18s" }}>{label}</button>
        ))}
      </div>

      {historyTab === "posts" && (
        <>
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
              {posts.map(p => (
                <Card key={p.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 11, flexWrap: "wrap", gap: 6 }}>
                    <Pill color={p.auto ? C.accent2 : C.accent}>{p.auto ? "↻ automatic" : "✋ manual"}</Pill>
                    <span style={{ fontSize: "0.66rem", color: C.muted, fontFamily: C.mono }}>{new Date(p.time).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6, marginBottom: 10 }}>{p.text.substring(0, 160)}{p.text.length > 160 ? "…" : ""}</div>
                  {p.results && Object.keys(p.results).length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(p.results).map(([id, r]) => (
                        <Pill key={id} color={r.ok ? C.supra : C.warn}>
                          {CHANNEL_ICONS[id] || "●"} {channels.find(c=>c.id===id)?.label || id} {r.ok ? "sent" : "skipped"}
                        </Pill>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {historyTab === "deposits" && (
        <DepositHistoryFull />
      )}
    </div>
  );

  const Generate = (
    <ComposePage isMobile={isMobile} wallet={wallet} pricing={pricing} settings={settings} updateSetting={updateSetting}
      saveSettings={saveSettings} channels={channels} generating={generating} handleGenerate={handleGenerate}
      tweet={tweet} setTweet={setTweet} scores={scores} genLog={genLog} onPost={onPost} />
  );

  const Referral = (
    <ReferralPage walletAddress={session?.address} isMobile={isMobile} />
  );
  const Admin = <AdminPage walletAddress={session?.address} />;
  const panels = { setup: Setup, channels: Channels, compose: Generate, automation: Automation, history: History, referral: Referral, admin: Admin };
  const visibleTabs = session?.isAdmin ? [...TABS, { id: "admin", icon: "🛠", label: "Admin" }] : TABS;

  if (showLanding && !session) return <LandingPage onEnter={() => setShowLanding(false)} />;
  if (!session) return <LoginScreen onSignedIn={setSession} isMobile={isMobile} />;

  /* ── Layouts ─────────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bgGrad, color: C.text, fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
        <GlobalStyle />
        {toastEl}
        <LowBalanceBanner balance={wallet.balance + (wallet.creditBalance || 0)} costPerPost={wallet.costPerPost} onDeposit={() => setTab("setup")} />

        {/* ── Top bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(10,8,20,0.92)",
          backdropFilter: "blur(16px)",
          position: "sticky", top: 0, zIndex: 100,
          WebkitBackdropFilter: "blur(16px)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "1rem", fontWeight: 800, fontFamily: C.display, letterSpacing: "-0.03em" }}>
              Supra<span style={{ color: C.accent }}>Post</span>
            </span>
            <span style={{
              fontSize: "0.52rem", color: C.muted,
              background: C.raised, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: "1px 5px", fontFamily: C.mono,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>AI</span>
          </div>

          {/* Status pills */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: C.raised, border: `1px solid ${C.border}`,
              borderRadius: 20, padding: "3px 8px",
              fontSize: "0.6rem", fontFamily: C.mono, color: C.supra, fontWeight: 600,
            }}>
              ⬡ {fmt(wallet.balance + (wallet.creditBalance || 0))}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: automation.running ? `${C.supra}18` : C.raised,
              border: `1px solid ${automation.running ? C.supra + "44" : C.border}`,
              borderRadius: 20, padding: "3px 8px",
              fontSize: "0.6rem", color: automation.running ? C.supra : C.muted, fontWeight: 600,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: automation.running ? C.supra : C.muted,
                animation: automation.running ? "softPulse 1.5s ease-in-out infinite" : "none",
                display: "inline-block", flexShrink: 0,
              }} />
              {automation.running ? "ON" : "OFF"}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div key={tab} className="fade-up" style={{
          flex: 1,
          padding: "14px 13px",
          paddingBottom: "calc(70px + env(safe-area-inset-bottom, 16px))",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}>{panels[tab]}</div>

        {/* ── Bottom tab bar — flush to bottom ── */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(8,6,18,0.96)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `0.5px solid ${C.border}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          display: "flex",
        }}>
          {visibleTabs.map(({ id, icon, label }) => {
            const active = tab === id;
            return (
              <div key={id} onClick={() => setTab(id)} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "9px 0 8px",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.18s",
              }}>
                {/* Active indicator */}
                {active && (
                  <div style={{
                    position: "absolute", top: 0, left: "20%", right: "20%",
                    height: 2, borderRadius: "0 0 2px 2px",
                    background: `linear-gradient(90deg, ${C.accent}, ${C.supra})`,
                  }} />
                )}
                <span style={{
                  fontSize: "1.1rem",
                  filter: active ? "none" : "grayscale(0.4)",
                  opacity: active ? 1 : 0.45,
                  transition: "all 0.18s",
                  transform: active ? "scale(1.08)" : "scale(1)",
                  display: "block",
                }}>{icon}</span>
                <span style={{
                  fontSize: "0.55rem",
                  marginTop: 3,
                  fontWeight: active ? 700 : 500,
                  color: active ? C.accent : C.muted,
                  letterSpacing: "0.02em",
                  transition: "all 0.18s",
                }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (isTablet) {
    return (
      <div style={{ background: C.bgGrad, color: C.text, minHeight: "100vh", fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
        <GlobalStyle />
        {toastEl}
        <LowBalanceBanner balance={wallet.balance + (wallet.creditBalance || 0)} costPerPost={wallet.costPerPost} onDeposit={() => setTab("setup")} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,14,26,0.7)", backdropFilter: "blur(10px)" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.15rem", fontFamily: C.display }}>Supra<span style={{ color: C.accent }}>Post</span></div>
            <div style={{ fontSize: "0.62rem", color: C.muted }}>AI Social Automation</div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <Pill color={C.supra}>⬡ {fmt(wallet.balance + (wallet.creditBalance || 0))}</Pill>
            <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>{automation.running ? "Active" : "Idle"}</Pill>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "12px 24px 0", borderBottom: `1px solid ${C.border}` }}>
          {visibleTabs.map(({ id, icon, label }) => (
            <div key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: "10px 10px 0 0", cursor: "pointer", fontSize: "0.84rem", fontWeight: 500, color: tab === id ? C.text : C.text2, background: tab === id ? C.surface : "transparent", borderBottom: tab === id ? `2px solid ${C.accent}` : "2px solid transparent" }}>
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>
        <div key={tab} className="fade-up" style={{ flex: 1, overflowY: "auto", padding: 28 }}>{panels[tab]}</div>
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ minHeight: "100dvh", background: C.bgGrad, color: C.text, fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
      <GlobalStyle />
      {toastEl}
      <LowBalanceBanner balance={wallet.balance + (wallet.creditBalance || 0)} costPerPost={wallet.costPerPost} onDeposit={() => setTab("setup")} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,14,26,0.6)", backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", fontFamily: C.display, letterSpacing: "-0.01em" }}>Supra<span style={{ color: C.accent }}>Post</span></div>
          <span style={{ fontSize: "0.74rem", color: C.muted, borderLeft: `1px solid ${C.border}`, paddingLeft: 14 }}>AI Social Automation</span>
        </div>
        <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
          <Pill color={C.supra}>⬡ {fmt(wallet.balance + (wallet.creditBalance || 0))} SUPRA</Pill>
          <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>{automation.running ? "Automation active" : "Idle"}</Pill>
          <Pill color={C.accent2} title={session?.address}>{shortAddress(session?.address)}</Pill>
          <Btn variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "252px 1fr 296px", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
          {visibleTabs.map(({ id, icon, label }) => (
            <div key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontSize: "0.88rem", fontWeight: 500, color: tab === id ? C.text : C.text2, background: tab === id ? `linear-gradient(135deg, ${C.accent}26, ${C.accent}0d)` : "transparent", border: `1px solid ${tab === id ? C.accent + "40" : "transparent"}`, transition: "all 0.18s" }}>
              <span style={{ fontSize: "1.05rem", width: 18, textAlign: "center" }}>{icon}</span> {label}
            </div>
          ))}

          <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "24px 14px 9px" }}>Wallet</div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total balance</div>
            <div style={{ fontFamily: C.mono, fontSize: "1.5rem", color: C.supra, fontWeight: 600, marginTop: 5 }}>{fmt(wallet.balance + (wallet.creditBalance || 0))}</div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>SUPRA tokens</div>
            {!!wallet.creditBalance && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted }}>Deposited</span><span style={{ fontFamily: C.mono, color: C.text2 }}>{fmt(wallet.balance)}</span>
              </div>
            )}
            {!!wallet.creditBalance && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginTop: 4 }}>
                <span style={{ color: C.muted }}>Referral credits</span><span style={{ fontFamily: C.mono, color: C.accent2 }}>{fmt(wallet.creditBalance)}</span>
              </div>
            )}
            {(wallet.balance + (wallet.creditBalance || 0)) <= wallet.costPerPost * 3 && (
              <div style={{ fontSize: "0.66rem", color: (wallet.balance + (wallet.creditBalance || 0)) < wallet.costPerPost ? C.danger : C.warn, marginTop: 8 }}>
                {(wallet.balance + (wallet.creditBalance || 0)) < wallet.costPerPost ? "⚠ Low — add funds" : "⚠ Running low"}
              </div>
            )}
            <Btn full variant="supra" size="sm" style={{ marginTop: 12 }} onClick={() => {
              setTab("setup");
              setTimeout(() => document.getElementById("deposit-section")?.scrollIntoView({ behavior: "smooth" }), 100);
            }}>Deposit SUPRA</Btn>
          </Card>

          <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "18px 14px 9px" }}>Channels</div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontFamily: C.mono, fontSize: "1.15rem", color: C.accent, fontWeight: 600 }}>{enabledChannelCount} active</div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>of {channels.length} platforms</div>
          </Card>
        </div>

        {/* Main */}
        <div key={tab} className="fade-up" style={{ overflowY: "auto", padding: 32 }}>{panels[tab]}</div>

        {/* Right rail */}
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
                {posts[0].text.substring(0, 110)}{posts[0].text.length > 110 ? "…" : ""}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}