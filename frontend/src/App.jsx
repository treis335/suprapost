import { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   DESIGN SYSTEM — "Pulse"
   A living, breathing automation product. The signature element
   is the orbit ring: a circular progress indicator that visualises
   the automation cycle as something alive, not just a countdown.

   Palette: near-black with violet undertone (not neutral gray),
   a warm signal-green for SUPRA/success, electric cyan for data/
   links, and a soft coral for danger — kept rare.
============================================================ */
const C = {
  bg: "#08070d",
  bgGrad: "radial-gradient(ellipse 120% 80% at 50% -10%, #14101f 0%, #08070d 55%)",
  surface: "#100e1a",
  surface2: "#171328",
  raised: "#1c1830",
  border: "#231f38",
  borderLight: "#332c52",
  accent: "#9b6bff",
  accentDeep: "#7c4cf0",
  accent2: "#3ed9d0",
  supra: "#3ddc91",
  warn: "#f5b942",
  danger: "#ff6b81",
  text: "#f1eefc",
  text2: "#a59cc7",
  muted: "#5f5783",
  display: "'Space Grotesk', 'Inter', sans-serif",
  sans: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Space Mono', monospace",
};

const fmt = (n) => Number(n ?? 0).toFixed(2);

/* ============================================================
   API CLIENT
============================================================ */
const api = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  },
  async del(path) {
    const res = await fetch(`/api${path}`, { method: "DELETE" });
    return res.json();
  },
};

/* ============================================================
   RESPONSIVE
============================================================ */
function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { isMobile: w < 880 };
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
    @keyframes spinSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .fade-up { animation: fadeUp 0.35s ease both; }

    input::placeholder, textarea::placeholder { color: ${C.muted}; }
    input:focus, textarea:focus, select:focus { outline: none; }

    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
    }
  `}</style>
);

/* ============================================================
   ORBIT RING — signature element
   A circular cycle indicator. When automation is running, the
   ring sweeps from empty to full across the cycle duration, then
   resets — visualising the bot's heartbeat instead of a flat
   countdown number.
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
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
          <div style={{ fontSize: "0.74rem", color: "#71767b" }}>via Telegram</div>
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

/* ============================================================
   MAIN APP
============================================================ */
export default function App() {
  const { isMobile } = useViewport();
  const [tab, setTab] = useState("setup");
  const [backendOk, setBackendOk] = useState(true);

  const [settings, setSettings] = useState({ niche: "", tone: "technical", audience: "", examples: "", avoid: "", postType: "alpha", customPrompt: "" });
  const [wallet, setWallet] = useState({ balance: 0, costPerPost: 1 });
  const [automation, setAutomation] = useState({ running: false, cycleSeconds: 21600, autoApprove: true, nextRunAt: null });
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ totalGenerations: 0, totalPosts: 0, supraEarned: 0 });

  const [generating, setGenerating] = useState(false);
  const [tweet, setTweet] = useState("");
  const [scores, setScores] = useState([]);
  const [genLog, setGenLog] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [countdown, setCountdown] = useState("");
  const [progress, setProgress] = useState(0);
  const cdRef = useRef(null);

  const refreshAll = useCallback(async () => {
    try {
      const [s, w, a, p, st] = await Promise.all([
        api.get("/settings"), api.get("/wallet"), api.get("/automation"), api.get("/posts"), api.get("/stats"),
      ]);
      setSettings(s); setWallet(w); setAutomation(a); setPosts(p); setStats(st);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  useEffect(() => {
    if (cdRef.current) clearInterval(cdRef.current);
    if (!automation.running || !automation.nextRunAt) { setCountdown(""); setProgress(0); return; }
    const totalMs = automation.cycleSeconds * 1000;
    const tick = () => {
      const rem = Math.max(0, new Date(automation.nextRunAt).getTime() - Date.now());
      const h = Math.floor(rem / 3600000), m = Math.floor((rem % 3600000) / 60000), s = Math.floor((rem % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      setProgress(Math.min(1, Math.max(0, 1 - rem / totalMs)));
    };
    tick();
    cdRef.current = setInterval(tick, 1000);
    return () => clearInterval(cdRef.current);
  }, [automation.running, automation.nextRunAt, automation.cycleSeconds]);

  function updateSetting(key, value) { setSettings((s) => ({ ...s, [key]: value })); }
  async function saveSettings() { const updated = await api.post("/settings", settings); setSettings(updated); }
  async function topUp(amount = 10) { const w = await api.post("/wallet/topup", { amount }); setWallet(w); }

  async function handleGenerate() {
    setGenerating(true); setTweet(""); setScores([]); setGenLog([]);
    await saveSettings();
    const result = await api.post("/generate", { autoPost: false });
    if (result.ok) {
      setTweet(result.post.text); setScores(result.post.scores); setGenLog(result.log);
    } else {
      setGenLog([{ time: new Date().toISOString(), msg: `✕ ${result.reason || "generation failed"}` }]);
    }
    await refreshAll();
    setGenerating(false);
  }

  async function handlePost(text = tweet) {
    const result = await api.post("/post", { text });
    if (result.ok) { setTweet(""); setScores([]); setEditing(false); await refreshAll(); }
  }

  async function saveAutomationSettings(patch) { const updated = await api.post("/automation/settings", patch); setAutomation(updated); }
  async function startAuto() { const a = await api.post("/automation/start"); setAutomation(a); }
  async function stopAuto() { const a = await api.post("/automation/stop"); setAutomation(a); }
  async function clearHistory() { await api.del("/posts"); await refreshAll(); }

  const TABS = [
    { id: "setup", icon: "⚙", label: "Setup" },
    { id: "generate", icon: "✦", label: "Generate" },
    { id: "automation", icon: "↻", label: "Automation" },
    { id: "history", icon: "▤", label: "History" },
  ];

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

      <Card eyebrow="Status" title="Backend Connection" right={<ConnStatus ok={backendOk} />}>
        <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6 }}>
          {backendOk
            ? "Server is running — settings and history stay saved even if you close this page."
            : "No connection to the backend. Make sure the server is running (npm start in the backend folder)."}
        </div>
      </Card>

      <Card eyebrow="Payments" title="SUPRA Wallet" accentTop={C.supra}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: "1.7rem", color: C.supra, fontWeight: 600 }}>{fmt(wallet.balance)} <span style={{ fontSize: "0.72rem", opacity: 0.7, fontWeight: 400 }}>SUPRA</span></div>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 4 }}>Cost per post: {fmt(wallet.costPerPost)} SUPRA · simulated for now</div>
          </div>
          <Btn variant="supra" onClick={() => topUp(10)}>+ 10 SUPRA</Btn>
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

      <Card eyebrow="Next Steps" title="API Configuration">
        <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.7 }}>
          The DeepSeek and Telegram keys are configured in the backend's <code style={{ background: C.bg, padding: "2px 7px", borderRadius: 5, fontFamily: C.mono, fontSize: "0.78rem" }}>.env</code> file — never here, for security. Edit <code style={{ background: C.bg, padding: "2px 7px", borderRadius: 5, fontFamily: C.mono, fontSize: "0.78rem" }}>backend/.env</code> and restart the server.
        </div>
      </Card>
    </div>
  );

  /* ============================================================
     PANEL: GENERATE
  ============================================================ */
  const Generate = (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Generate Post</div>
            <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>The AI generates, self-critiques, then waits for your approval.</div>
          </div>
        )}
        <Card eyebrow="Generation" title="Options">
          <Field label="Custom prompt" hint="Leave blank to use your profile automatically">
            <Input placeholder="Optional..." value={settings.customPrompt} onChange={(e) => updateSetting("customPrompt", e.target.value)} onBlur={saveSettings} />
          </Field>
          <Field label="Post type">
            <Select value={settings.postType} onChange={(e) => updateSetting("postType", e.target.value)} onBlur={saveSettings}>
              <option value="alpha">Alpha / Insight</option>
              <option value="thread">Thread Opener</option>
              <option value="news">News Commentary</option>
              <option value="educational">Educational</option>
              <option value="engagement">Engagement</option>
            </Select>
          </Field>
          <Btn full variant="primary" size="lg" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : `✦ Generate Post — ${fmt(wallet.costPerPost)} SUPRA`}
          </Btn>
        </Card>
        <Card eyebrow="Pipeline" title="Generation Log">
          <Log lines={genLog} />
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {tweet ? (
          <>
            <Card eyebrow="Quality Gate" title="Self-Critique" accentTop={C.accent}>
              {scores.map((sc) => <ScoreBar key={sc.label} {...sc} />)}
            </Card>
            <Card eyebrow="Preview" title="Post">
              <TweetPreview text={editing ? editText : tweet} />
              <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
                <Btn variant="supra" style={{ flex: 1 }} onClick={() => handlePost(editing ? editText : tweet)}>🚀 Post Now</Btn>
                <Btn variant="ghost" onClick={handleGenerate} disabled={generating}>↻ Regenerate</Btn>
                <Btn variant="cyan" onClick={() => { setEditing((e) => !e); setEditText(tweet); }}>Edit</Btn>
              </div>
              {editing && (
                <div className="fade-up" style={{ marginTop: 14 }}>
                  <TextArea value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn variant="supra" size="sm" onClick={() => { setTweet(editText); setEditing(false); }}>Apply</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card style={{ textAlign: "center", padding: "56px 28px", border: `1.5px dashed ${C.border}`, background: "transparent" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.4 }}>✦</div>
            <div style={{ fontSize: "0.86rem", color: C.muted }}>Your generated post will appear here</div>
          </Card>
        )}
      </div>
    </div>
  );

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
            ? <Btn variant="primary" size="lg" onClick={startAuto}>▶ Start Automation</Btn>
            : <Btn variant="danger" size="lg" onClick={stopAuto}>■ Stop Automation</Btn>}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 13 }}>
        <StatTile label="Auto Posts" value={posts.filter((p) => p.auto).length} color={C.supra} />
        <StatTile label="SUPRA / Cycle" value={fmt(wallet.costPerPost)} color={C.accent} />
        <StatTile label="Total Spent" value={fmt(stats.supraEarned)} color={C.warn} />
        <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
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
        </Card>

        <Card eyebrow="How It Works" title="The Server Takes Over">
          <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.75 }}>
            Once you start automation, the backend generates, charges SUPRA, and publishes to Telegram on its own, on the cycle you set. You don't need to keep this page open — only the server (<code style={{ background: C.bg, padding: "2px 7px", borderRadius: 5, fontFamily: C.mono, fontSize: "0.76rem" }}>npm start</code>) needs to be running.
          </div>
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
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 13 }}>
          {posts.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 11 }}>
                <Pill color={p.auto ? C.accent2 : C.accent}>{p.auto ? "↻ auto" : "✋ manual"}</Pill>
                <span style={{ fontSize: "0.66rem", color: C.muted, fontFamily: C.mono }}>{new Date(p.time).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: C.text2, lineHeight: 1.6, marginBottom: 10 }}>{p.text.substring(0, 160)}{p.text.length > 160 ? "..." : ""}</div>
              {"posted" in p && <Pill color={p.posted ? C.supra : C.warn}>{p.posted ? "sent to Telegram" : "not sent"}</Pill>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const panels = { setup: Setup, generate: Generate, automation: Automation, history: History };

  /* ============================================================
     LAYOUTS
  ============================================================ */
  if (isMobile) {
    return (
      <div style={{ background: C.bgGrad, color: C.text, minHeight: "100vh", fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
        <GlobalStyle />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,14,26,0.85)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: C.display }}>Supra<span style={{ color: C.accent }}>Post</span></div>
          <div style={{ display: "flex", gap: 7 }}>
            <Pill color={C.supra}>⬡ {fmt(wallet.balance)}</Pill>
            <Pill color={automation.running ? C.supra : C.muted} dot pulse={automation.running}>{automation.running ? "ON" : "OFF"}</Pill>
          </div>
        </div>

        <div style={{ flex: 1, padding: "18px 16px 96px", overflowY: "auto" }}>
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

  return (
    <div style={{ background: C.bgGrad, color: C.text, minHeight: "100vh", fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
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
            <Btn full variant="supra" size="sm" style={{ marginTop: 12 }} onClick={() => topUp(10)}>+ Add 10 SUPRA</Btn>
          </Card>

          <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em", padding: "18px 14px 9px" }}>Cost / Post</div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontFamily: C.mono, fontSize: "1.15rem", color: C.accent, fontWeight: 600 }}>{fmt(wallet.costPerPost)} SUPRA</div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 3 }}>~$0.05 in API cost</div>
          </Card>
        </div>

        <div style={{ overflowY: "auto", padding: 32 }}>
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
