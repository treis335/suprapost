import { useCallback, useEffect, useRef, useState } from "react";
import { C, fmt } from "./theme";
import { useViewport } from "./hooks/useViewport";
import { api } from "./lib/api";

// UI primitives
import { GlobalStyle } from "./components/ui/GlobalStyle";

// Layout
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { RightPanel } from "./components/layout/RightPanel";
import { MobileHeader, MobileNav } from "./components/layout/MobileNav";

// Pages
import { SetupPage } from "./pages/SetupPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { GeneratePage } from "./pages/GeneratePage";
import { AutomationPage } from "./pages/AutomationPage";
import { HistoryPage } from "./pages/HistoryPage";

/* ============================================================
   TAB REGISTRY — the only place that needs changing when a new
   top-level section is added to the app.
============================================================ */
const TABS = [
  { id: "setup", icon: "⚙", label: "Setup" },
  { id: "channels", icon: "📡", label: "Channels" },
  { id: "generate", icon: "✦", label: "Generate" },
  { id: "automation", icon: "⚡", label: "Automation" },
  { id: "history", icon: "📋", label: "History" },
];

/* ── countdown formatter ─────────────────────────────────── */
function fmtCountdown(ms) {
  if (ms <= 0) return "Now";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), sec = s % 60;
  if (m < 60) return `${m}m ${sec}s`;
  const h = Math.floor(m / 60), min = m % 60;
  return `${h}h ${min}m`;
}

export default function App() {
  const { isMobile, isDesktop } = useViewport();

  // ── Tab
  const [tab, setTab] = useState("generate");

  // ── Backend ping
  const [backendOk, setBackendOk] = useState(false);

  // ── Server data
  const [settings, setSettings] = useState({ niche: "", tone: "technical", audience: "", examples: "", avoid: "", postType: "alpha", customPrompt: "" });
  const [channels, setChannels] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, costPerPost: 1 });
  const [automation, setAutomation] = useState({ running: false, cycleSeconds: 21600, autoApprove: true, nextRunAt: null });
  const [stats, setStats] = useState({ totalGenerations: 0, totalPosts: 0, supraEarned: 0 });
  const [posts, setPosts] = useState([]);

  // ── Generate page local state
  const [tweet, setTweet] = useState("");
  const [scores, setScores] = useState([]);
  const [genLog, setGenLog] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // ── Automation orbit
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState("—");
  const timerRef = useRef(null);

  /* ── Initial data load ─────────────────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      const [h, s, ch, w, a, st, p] = await Promise.all([
        api.get("/health"),
        api.get("/settings"),
        api.get("/channels"),
        api.get("/wallet"),
        api.get("/automation"),
        api.get("/stats"),
        api.get("/posts"),
      ]);
      setBackendOk(!!h?.ok);
      setSettings(s);
      setChannels(Array.isArray(ch) ? ch : []);
      setWallet(w);
      setAutomation(a);
      setStats(st);
      setPosts(Array.isArray(p) ? p : []);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  /* ── Settings helpers ──────────────────────────────────── */
  function updateSetting(key, val) { setSettings((s) => ({ ...s, [key]: val })); }
  async function saveSettings() {
    try { const s = await api.post("/settings", settings); setSettings(s); } catch {}
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
  async function handleGenerate() {
    setGenerating(true);
    setGenLog([]);
    setTweet("");
    setScores([]);
    setEditing(false);
    try {
      const data = await api.post("/generate", { autoPost: false });
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
  async function onPost(text) {
    try {
      const result = await api.post("/post", { text });
      setPosts((p) => [result.post, ...p]);
      setStats((s) => ({ ...s, totalPosts: (s.totalPosts || 0) + 1 }));
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

  /* ── Common page props ─────────────────────────────────── */
  const shared = { isMobile };

  /* ── Render current page ───────────────────────────────── */
  function renderPage() {
    switch (tab) {
      case "setup": return <SetupPage {...shared} backendOk={backendOk} wallet={wallet} topUp={topUp} settings={settings} updateSetting={updateSetting} saveSettings={saveSettings} />;
      case "channels": return <ChannelsPage {...shared} channels={channels} onSaveChannel={onSaveChannel} onTestChannel={onTestChannel} />;
      case "generate": return <GeneratePage {...shared} settings={settings} updateSetting={updateSetting} saveSettings={saveSettings} wallet={wallet} generating={generating} handleGenerate={handleGenerate} tweet={tweet} setTweet={setTweet} scores={scores} genLog={genLog} editing={editing} setEditing={setEditing} editText={editText} setEditText={setEditText} channels={channels} onPost={onPost} />;
      case "automation": return <AutomationPage {...shared} automation={automation} progress={progress} countdown={countdown} startAuto={startAuto} stopAuto={stopAuto} saveAutomationSettings={saveAutomationSettings} posts={posts} wallet={wallet} stats={stats} channels={channels} />;
      case "history": return <HistoryPage {...shared} posts={posts} stats={stats} clearHistory={clearHistory} />;
      default: return null;
    }
  }

  /* ── Layout ────────────────────────────────────────────── */
  const SIDEBAR_W = 210;
  const RIGHT_W = 240;

  /* ─── Mobile ─── */
  if (isMobile) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bgGrad, color: C.text, fontFamily: C.sans }}>
        <GlobalStyle />
        <MobileHeader wallet={wallet} automation={automation} />
        <div style={{ padding: "20px 16px 90px" }}>{renderPage()}</div>
        <MobileNav tabs={TABS} tab={tab} setTab={setTab} />
      </div>
    );
  }

  /* ─── Tablet + Desktop ─── */
  return (
    <div style={{ minHeight: "100dvh", background: C.bgGrad, color: C.text, fontFamily: C.sans, display: "flex", flexDirection: "column" }}>
      <GlobalStyle />
      <TopBar backendOk={backendOk} wallet={wallet} automation={automation} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: isDesktop ? `${SIDEBAR_W}px 1fr ${RIGHT_W}px` : `${SIDEBAR_W}px 1fr`, overflow: "hidden", minHeight: 0 }}>
        <Sidebar tabs={TABS} tab={tab} setTab={setTab} wallet={wallet} topUp={topUp} />
        <main style={{ overflowY: "auto", padding: "28px 32px" }}>{renderPage()}</main>
        {isDesktop && <RightPanel stats={stats} settings={settings} posts={posts} />}
      </div>
    </div>
  );
}
