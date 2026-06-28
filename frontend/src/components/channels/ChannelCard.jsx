import { useEffect, useState } from "react";
import { C } from "../../theme";
import { Btn, Card, Field, Input, Pill, Switch } from "../ui";

/**
 * Channel card — always shows credential fields, no expand/collapse bug.
 * State is kept locally; saving writes to backend and updates parent.
 */
export function ChannelCard({ channel, onSave, onTest }) {
  const [values, setValues]       = useState(channel.values ?? {});
  const [enabled, setEnabled]     = useState(channel.enabled ?? false);
  const [dirty, setDirty]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showFields, setShowFields] = useState(false);

  // Sync when parent pushes new channel data (e.g. after save)
  useEffect(() => {
    setValues(channel.values ?? {});
    setEnabled(channel.enabled ?? false);
    setDirty(false);
  }, [channel.id, channel.configured]);

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty(true);
    setTestResult(null);
  }

  function handleToggle(next) {
    setEnabled(next);
    setDirty(true);
    setTestResult(null);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(channel.id, { ...values, enabled });
    setSaving(false);
    setDirty(false);
    setShowFields(false);
  }

  async function handleTest() {
    if (dirty) await handleSave();
    setTesting(true);
    setTestResult(null);
    const result = await onTest(channel.id);
    setTestResult(result);
    setTesting(false);
  }

  const isActive     = channel.configured && enabled;
  const isPaused     = channel.configured && !enabled;
  const isNew        = !channel.configured;
  const isComingSoon = channel.comingSoon;

  const statusColor = isActive ? C.supra : isPaused ? C.warn : C.muted;
  const statusLabel = isComingSoon ? "Coming soon"
    : isActive  ? "Active"
    : isPaused  ? "Paused"
    : "Not connected";

  return (
    <Card
      accentTop={isActive ? channel.color : undefined}
      style={{ opacity: isComingSoon ? 0.55 : 1, display: "flex", flexDirection: "column", gap: 0 }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `${channel.color}18`,
            border: `1.5px solid ${isActive ? channel.color + "66" : channel.color + "28"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem",
            boxShadow: isActive ? `0 0 14px -4px ${channel.color}55` : "none",
            transition: "box-shadow 0.3s",
          }}>{channel.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontFamily: C.display, fontSize: "1rem", letterSpacing: "-0.01em" }}>
              {channel.name}
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
        {!isComingSoon && (
          <Switch checked={enabled} onChange={handleToggle} />
        )}
      </div>

      {/* ── Description ───────────────────────────────────── */}
      {channel.description && (
        <div style={{ fontSize: "0.78rem", color: C.text2, lineHeight: 1.6, marginBottom: 16 }}>
          {channel.description}
        </div>
      )}

      {/* ── Credentials section ───────────────────────────── */}
      {!isComingSoon && channel.fields?.length > 0 && (
        <>
          {/* Divider + toggle */}
          <button
            onClick={() => setShowFields((s) => !s)}
            style={{
              all: "unset", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 0",
              borderTop: `1px solid ${C.border}`,
              fontSize: "0.75rem", color: showFields ? C.accent : C.text2,
              fontWeight: 600, letterSpacing: "0.02em",
              transition: "color 0.2s",
              userSelect: "none",
            }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, borderRadius: 5,
              background: showFields ? `${C.accent}22` : C.raised,
              border: `1px solid ${showFields ? C.accent + "55" : C.border}`,
              fontSize: "0.6rem", color: showFields ? C.accent : C.muted,
              transition: "all 0.2s", flexShrink: 0,
            }}>
              {showFields ? "▲" : "▼"}
            </span>
            {channel.configured ? "Update credentials" : "Set up connection"}
          </button>

          {showFields && (
            <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
              {channel.fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Input
                    type={f.type === "password" ? "password" : "text"}
                    placeholder={f.placeholder || ""}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                </Field>
              ))}

              {/* Help link */}
              {channel.helpUrl && (
                <a
                  href={channel.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "0.72rem", color: C.accent2, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 4,
                    marginBottom: 14, alignSelf: "flex-start",
                    opacity: 0.85,
                  }}
                >
                  Where do I find these? ↗
                </a>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty || saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={testing || (!channel.configured && !dirty)}
                >
                  {testing ? "Testing…" : "Test"}
                </Btn>
              </div>

              {/* Test result */}
              {testResult && (
                <div
                  className="fade-up"
                  style={{
                    marginTop: 10,
                    fontSize: "0.75rem", padding: "9px 13px", borderRadius: 8, lineHeight: 1.5,
                    background: testResult.ok ? `${C.supra}14` : `${C.danger}14`,
                    border: `1px solid ${testResult.ok ? C.supra : C.danger}44`,
                    color: testResult.ok ? C.supra : C.danger,
                  }}
                >
                  {testResult.ok
                    ? "✓ Connection successful."
                    : `✕ ${testResult.error || testResult.reason || "Connection failed — check your credentials."}`}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Coming soon overlay message */}
      {isComingSoon && (
        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4,
          fontSize: "0.74rem", color: C.muted,
        }}>
          Integration coming soon.
        </div>
      )}
    </Card>
  );
}
