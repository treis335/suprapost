import { useEffect, useState } from "react";
import { C } from "../../theme";
import { Btn, Card, Field, Input, Switch } from "../ui";

export function ChannelCard({ channel, onSave, onTest }) {
  const [values, setValues]       = useState(channel.values ?? {});
  const [enabled, setEnabled]     = useState(channel.enabled ?? false);
  const [dirty, setDirty]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    // Só sincroniza do parent se o utilizador não estiver a editar.
    // Sem isto, o polling do backend fechava os campos e limpava os valores.
    if (dirty) return;
    setValues(channel.values ?? {});
    setEnabled(channel.enabled ?? false);
  }, [channel.id, channel.configured]);

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty(true);
    setTestResult(null);
    setSaved(false);
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
  const isComingSoon = channel.comingSoon;
  const statusColor  = isActive ? C.supra : isPaused ? C.warn : C.muted;
  const statusLabel  = isComingSoon ? "Em breve" : isActive ? "Ativo" : isPaused ? "Pausado" : "Por configurar";

  return (
    <Card
      accentTop={isActive ? channel.color : undefined}
      style={{ opacity: isComingSoon ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 0 }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: channel.fields?.length ? 18 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `${channel.color}15`,
            border: `1.5px solid ${isActive ? channel.color + "66" : channel.color + "25"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.25rem",
            boxShadow: isActive ? `0 0 18px -6px ${channel.color}66` : "none",
            transition: "all 0.3s",
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
        {!isComingSoon && channel.fields?.length > 0 && (
          <Switch checked={enabled} onChange={handleToggle} />
        )}
      </div>

      {/* ── Coming soon ── */}
      {isComingSoon && (
        <div style={{ fontSize: "0.78rem", color: C.muted, lineHeight: 1.6 }}>
          Integração disponível em breve.
        </div>
      )}

      {/* ── Credential fields — always visible ── */}
      {!isComingSoon && channel.fields?.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Section label */}
          <div style={{ fontSize: "0.68rem", color: C.muted, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
            {channel.configured ? "Credenciais" : "Configurar ligação"}
          </div>

          {channel.fields.map((f) => (
            <Field key={f.key} label={f.label}>
              <div style={{ position: "relative" }}>
                <Input
                  type={f.type === "password" ? "password" : "text"}
                  placeholder={f.placeholder || ""}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  style={{
                    paddingRight: values[f.key] ? 36 : 12,
                    borderColor: values[f.key] ? `${channel.color}55` : undefined,
                  }}
                />
                {/* indicator — campo preenchido */}
                {values[f.key] && (
                  <span style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: "0.7rem", color: C.supra, pointerEvents: "none",
                  }}>✓</span>
                )}
              </div>
            </Field>
          ))}

          {/* Help link */}
          {channel.helpUrl && (
            <a href={channel.helpUrl} target="_blank" rel="noreferrer" style={{
              fontSize: "0.72rem", color: C.accent2, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 4,
              marginBottom: 14, alignSelf: "flex-start", opacity: 0.85,
            }}>
              Onde encontro estas credenciais? ↗
            </a>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <Btn
              variant="primary" size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
            >
              {saving ? "A guardar…" : saved ? "✓ Guardado" : "Guardar"}
            </Btn>
            <Btn
              variant="ghost" size="sm"
              onClick={handleTest}
              disabled={testing || (!channel.configured && !dirty)}
            >
              {testing ? "A testar…" : "Testar ligação"}
            </Btn>
          </div>

          {/* Test result */}
          {testResult && (
            <div className="fade-up" style={{
              marginTop: 10, fontSize: "0.75rem", padding: "9px 13px",
              borderRadius: 8, lineHeight: 1.5,
              background: testResult.ok ? `${C.supra}14` : `${C.danger}14`,
              border: `1px solid ${testResult.ok ? C.supra : C.danger}44`,
              color: testResult.ok ? C.supra : C.danger,
            }}>
              {testResult.ok
                ? "✓ Ligação bem-sucedida."
                : `✕ ${testResult.error || testResult.reason || "Falha na ligação — verifica as credenciais."}`}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
