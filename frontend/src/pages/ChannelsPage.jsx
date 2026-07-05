import { useState, useCallback } from "react";
import { C } from "../theme";
import { Btn, Card, Field, Input } from "../components/ui";

const CHANNEL_INFO = {
  telegram:  {
    name: "Telegram", icon: "✈", color: "#34b7eb",
    fields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF..." },
      { key: "chatId",   label: "Chat ID",   placeholder: "-100123456789" },
    ],
    helpUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot",
  },
  discord: {
    name: "Discord", icon: "🎮", color: "#5865F2",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
    ],
    helpUrl: "https://support.discord.com/hc/en-us/articles/228383668",
  },
  twitter: {
    name: "Twitter / X", icon: "𝕏", color: "#1d9bf0",
    fields: [
      { key: "apiKey",       label: "API Key",              placeholder: "" },
      { key: "apiSecret",    label: "API Secret",           placeholder: "" },
      { key: "accessToken",  label: "Access Token",         placeholder: "" },
      { key: "accessSecret", label: "Access Token Secret",  placeholder: "" },
    ],
    helpUrl: "https://developer.twitter.com/en/portal/dashboard",
  },
  instagram: {
    name: "Instagram", icon: "📷", color: "#E1306C",
    fields: [
      { key: "accessToken",  label: "Access Token",            placeholder: "" },
      { key: "igUserId",     label: "Account ID",              placeholder: "" },
      { key: "imageBaseUrl", label: "Public URL for images", placeholder: "https://yourdomain.com" },
    ],
    helpUrl: "https://developers.facebook.com/docs/instagram-platform",
  },
};

/* ── ChannelRow — fully self-contained component ── */
function ChannelRow({ id, channel, onSave, onToggle, onTest }) {
  const info = CHANNEL_INFO[id];
  const configured = channel?.configured ?? false;
  const enabled    = channel?.enabled    ?? false;

  // Local state — never reset by the parent
  const [creds, setCreds]         = useState(() => channel?.credentials ?? channel?.values ?? {});
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved]         = useState(false);

  const isActive = configured && enabled;
  const isPaused = configured && !enabled;
  const statusColor = isActive ? C.supra : isPaused ? C.warn : C.muted;
  const statusLabel = isActive ? "Active" : isPaused ? "Paused" : "Not set up";

  const setField = useCallback((key, val) => {
    setCreds(prev => ({ ...prev, [key]: val }));
    setTestResult(null);
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    await onSave(id, { credentials: creds, enabled: true });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await onTest(id);
    setTestResult(result);
    setTesting(false);
  }

  async function handleToggle() {
    await onToggle(id, !enabled);
  }

  return (
    <Card
      accentTop={isActive ? info.color : undefined}
      style={{ display: "flex", flexDirection: "column", gap: 0 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `${info.color}15`,
            border: `1.5px solid ${isActive ? info.color + "66" : info.color + "25"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.25rem",
            boxShadow: isActive ? `0 0 18px -6px ${info.color}66` : "none",
            transition: "all 0.3s",
          }}>{info.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontFamily: C.display, fontSize: "1rem", letterSpacing: "-0.01em" }}>
              {info.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: statusColor,
                boxShadow: isActive ? `0 0 6px ${statusColor}` : "none",
                animation: isActive ? "softPulse 2s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontSize: "0.72rem", color: statusColor, fontFamily: C.mono }}>{statusLabel}</span>
            </div>
          </div>
        </div>

        {/* Toggle — only active if already configured */}
        <button
          onClick={handleToggle}
          disabled={!configured}
          title={configured ? (enabled ? "Pausar" : "Ativar") : "Guarda as credenciais primeiro"}
          style={{
            width: 44, height: 25, borderRadius: 20, padding: 0, border: "none",
            background: enabled && configured ? info.color : C.border,
            position: "relative", cursor: configured ? "pointer" : "not-allowed",
            opacity: configured ? 1 : 0.3, transition: "background 0.25s", flexShrink: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: enabled && configured ? 22 : 3,
            width: 19, height: 19, borderRadius: "50%", background: "#fff",
            transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }} />
        </button>
      </div>

      {/* Credentials — always visible, never collapse */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{
          fontSize: "0.68rem", color: C.muted, fontFamily: C.mono,
          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>{configured ? "Credentials" : "Set up connection"}</span>
          {info.helpUrl && (
            <a href={info.helpUrl} target="_blank" rel="noreferrer" style={{
              fontSize: "0.7rem", color: C.accent2, textDecoration: "none",
              fontWeight: 400, textTransform: "none", letterSpacing: 0,
            }}>Where do I find these? ↗</a>
          )}
        </div>

        {info.fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                placeholder={f.placeholder || ""}
                value={creds[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                autoComplete="new-password"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.bg, color: C.text,
                  border: `1.5px solid ${creds[f.key] ? info.color + "66" : C.border}`,
                  borderRadius: 10, padding: "10px 36px 10px 13px",
                  fontSize: "0.88rem", outline: "none",
                  transition: "border-color 0.15s",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => { e.target.style.borderColor = info.color; e.target.style.boxShadow = `0 0 0 3px ${info.color}22`; }}
                onBlur={(e) => {
                  e.target.style.borderColor = creds[f.key] ? info.color + "66" : C.border;
                  e.target.style.boxShadow = "none";
                }}
              />
              {creds[f.key] && (
                <span style={{
                  position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                  fontSize: "0.7rem", color: C.supra, pointerEvents: "none",
                }}>✓</span>
              )}
            </div>
          </Field>
        ))}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              all: "unset", cursor: saving ? "not-allowed" : "pointer",
              padding: "8px 16px", borderRadius: 9,
              background: saved ? `${C.supra}22` : `${info.color}cc`,
              color: saved ? C.supra : "#fff",
              fontSize: "0.82rem", fontWeight: 700,
              border: `1.5px solid ${saved ? C.supra + "55" : "transparent"}`,
              transition: "all 0.2s", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !configured}
            style={{
              all: "unset", cursor: testing || !configured ? "not-allowed" : "pointer",
              padding: "8px 16px", borderRadius: 9,
              background: C.raised, color: C.text2,
              fontSize: "0.82rem", fontWeight: 600,
              border: `1.5px solid ${C.border}`,
              transition: "all 0.2s", opacity: testing || !configured ? 0.5 : 1,
            }}
          >
            {testing ? "Testing…" : "Test"}
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: 10, fontSize: "0.75rem", padding: "9px 13px",
            borderRadius: 8, lineHeight: 1.5,
            background: testResult.ok ? `${C.supra}14` : `${C.danger}14`,
            border: `1px solid ${testResult.ok ? C.supra : C.danger}44`,
            color: testResult.ok ? C.supra : C.danger,
          }}>
            {testResult.ok
              ? "✓ Connection successful."
              : `✕ ${testResult.error || testResult.reason || "Failed — check your credentials."}`}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── ChannelsPanel — exported for App.jsx ── */
export function ChannelsPanel({ isMobile, isCompact, channels, onSave, onToggle, onTest }) {
  const configured = channels.filter(c => c.configured && c.enabled).length;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Channels</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>
            {configured > 0
              ? `${configured} channel${configured > 1 ? "s" : ""} active — posts will be published to all of them.`
              : "Connect your social networks to start posting automatically."}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
        {Object.keys(CHANNEL_INFO).map(id => (
          <ChannelRow
            key={id}
            id={id}
            channel={channels.find(c => c.id === id)}
            onSave={onSave}
            onToggle={onToggle}
            onTest={onTest}
          />
        ))}
      </div>
    </div>
  );
}
