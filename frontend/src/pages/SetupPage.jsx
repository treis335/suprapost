import { C, fmt } from "../theme";
import { TopUpFlow } from "../TopUpFlow";
import { Card, Field, Input, Select, TextArea, Btn } from "../components/ui";

export function SetupPage({ isMobile, wallet, walletAddress, onCredited, settings, updateSetting, saveSettings }) {
  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Setup</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>Define o teu estilo, nicho e preferências de conteúdo.</div>
        </div>
      )}


      <Card eyebrow="Carteira" title="Saldo SUPRA" accentTop={C.supra}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: C.mono, fontSize: "2rem", color: C.supra, fontWeight: 700, lineHeight: 1 }}>
            {fmt(wallet.balance)}
            <span style={{ fontSize: "0.8rem", opacity: 0.6, fontWeight: 400, marginLeft: 6 }}>SUPRA</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 6 }}>{fmt(wallet.costPerPost)} SUPRA por publicação</div>
        </div>
        <TopUpFlow walletAddress={walletAddress} onCredited={onCredited} />
      </Card>

      <Card eyebrow="Conteúdo" title="Perfil de publicação">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 18px" }}>
          <Field label="Nicho / Tema"><Input placeholder="ex: DeFi, Supra blockchain, trading" value={settings.niche} onChange={(e) => updateSetting("niche", e.target.value)} onBlur={saveSettings} /></Field>
          <Field label="Tom de voz">
            <Select value={settings.tone} onChange={(e) => updateSetting("tone", e.target.value)} onBlur={saveSettings}>
              <option value="technical">Técnico & Informativo</option>
              <option value="casual">Casual & Apelativo</option>
              <option value="hype">Hype & Bullish</option>
              <option value="educational">Educacional</option>
              <option value="alpha">Alpha Calls</option>
            </Select>
          </Field>
          <Field label="Público-alvo"><Input placeholder="ex: traders DeFi, developers Web3" value={settings.audience} onChange={(e) => updateSetting("audience", e.target.value)} onBlur={saveSettings} /></Field>
          <Field label="Tópicos a evitar"><Input placeholder="ex: política, previsões de preço" value={settings.avoid} onChange={(e) => updateSetting("avoid", e.target.value)} onBlur={saveSettings} /></Field>
        </div>
        <Field label="Exemplos de posts que gostas" hint="Um por linha — ajuda a IA a imitar o teu estilo">
          <TextArea placeholder="Cola 3-5 exemplos de posts..." value={settings.examples} onChange={(e) => updateSetting("examples", e.target.value)} onBlur={saveSettings} />
        </Field>
        <Btn variant="primary" onClick={saveSettings}>Guardar perfil</Btn>
      </Card>


    </div>
  );
}
