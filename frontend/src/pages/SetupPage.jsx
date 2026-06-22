import { C, fmt } from "../theme";
import { Card, Field, Input, Select, TextArea, Btn, ConnStatus } from "../components/ui";

export function SetupPage({ isMobile, backendOk, wallet, topUp, settings, updateSetting, saveSettings }) {
  return (
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
          The DeepSeek key is configured in the backend's <code style={{ background: C.bg, padding: "2px 7px", borderRadius: 5, fontFamily: C.mono, fontSize: "0.78rem" }}>.env</code> file, never here, for security. Social network credentials (Telegram, Discord, X, Instagram) are managed from the <strong>Channels</strong> tab instead — no redeploy needed when you add or rotate a token.
        </div>
      </Card>
    </div>
  );
}
