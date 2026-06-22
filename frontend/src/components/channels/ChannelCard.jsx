import { useEffect, useState } from "react";
import { C } from "../../theme";
import { Btn, Card, Field, Input, Pill, Switch } from "../ui";

/**
 * One card per social network: enable toggle, credential fields,
 * Save + Test Connection. This is the piece that makes adding a new
 * network purely additive — the backend exposes a `fields` schema per
 * channel (see backend/src/channels/*.js) and this card renders
 * whatever it's given, so no frontend changes are needed to support
 * a future network beyond the registry entry itself.
 */
export function ChannelCard({ channel, onSave, onTest }) {
  const [values, setValues] = useState(channel.values);
  const [enabled, setEnabled] = useState(channel.enabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setValues(channel.values);
    setEnabled(channel.enabled);
    setDirty(false);
  }, [channel]);

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty(true);
    setTestResult(null);
  }

  function toggleEnabled(next) {
    setEnabled(next);
    setDirty(true);
    setTestResult(null);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(channel.id, { ...values, enabled });
    setSaving(false);
    setDirty(false);
  }

  async function handleTest() {
    if (dirty) await handleSave();
    setTesting(true);
    setTestResult(null);
    const result = await onTest(channel.id);
    setTestResult(result);
    setTesting(false);
  }

  const status = channel.comingSoon
    ? { label: "Coming soon", color: C.muted }
    : channel.configured
    ? enabled
      ? { label: "Active", color: C.supra }
      : { label: "Configured · paused", color: C.warn }
    : { label: "Not configured", color: C.muted };

  return (
    <Card
      accentTop={status.color !== C.muted ? channel.color : undefined}
      style={{ opacity: channel.comingSoon ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: `${channel.color}1f`, border: `1px solid ${channel.color}40`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem",
          }}>{channel.icon}</div>
          <div>
            <div style={{ fontWeight: 600, fontFamily: C.display, fontSize: "0.96rem" }}>{channel.name}</div>
            <Pill color={status.color}>{status.label}</Pill>
          </div>
        </div>
        <Switch checked={enabled} onChange={toggleEnabled} disabled={channel.comingSoon} />
      </div>

      <div style={{ fontSize: "0.76rem", color: C.text2, lineHeight: 1.55 }}>{channel.description}</div>

      {!channel.comingSoon && (
        <div>
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
        </div>
      )}

      {!channel.comingSoon && (
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
          <Btn variant="primary" size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save"}
          </Btn>
          <Btn variant="ghost" size="sm" onClick={handleTest} disabled={testing || (!channel.configured && !dirty)}>
            {testing ? "Testing..." : "Test connection"}
          </Btn>
          {channel.helpUrl && (
            <a href={channel.helpUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: C.muted, marginLeft: "auto" }}>
              Where do I get this? ↗
            </a>
          )}
        </div>
      )}

      {testResult && (
        <div className="pop-in" style={{
          fontSize: "0.74rem", padding: "9px 12px", borderRadius: 8, lineHeight: 1.5,
          background: testResult.ok ? `${C.supra}14` : `${C.danger}14`,
          border: `1px solid ${testResult.ok ? C.supra : C.danger}40`,
          color: testResult.ok ? C.supra : C.danger,
        }}>
          {testResult.ok ? "✓ Test message sent successfully." : `✕ ${testResult.error || "Connection failed — check your credentials."}`}
        </div>
      )}
    </Card>
  );
}
