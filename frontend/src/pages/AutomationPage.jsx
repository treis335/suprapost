import { C, fmt } from "../theme";
import { Btn, Card, OrbitRing, Select, StatTile, Switch, Pill } from "../components/ui";

export function AutomationPage({
  isMobile, automation, progress, countdown, startAuto, stopAuto,
  saveAutomationSettings, posts, wallet, stats, channels,
}) {
  const active = channels.filter((c) => c.enabled && c.configured && !c.comingSoon);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Automation</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>Posts automatically to all enabled channels on your schedule.</div>
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
            ? <Btn variant="primary" size="lg" onClick={startAuto} disabled={active.length === 0}>▶ Start Automation</Btn>
            : <Btn variant="danger" size="lg" onClick={stopAuto}>■ Stop Automation</Btn>}
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
          {active.length === 0 ? (
            <span style={{ fontSize: "0.74rem", color: C.warn }}>Enable a channel first — see the Channels tab</span>
          ) : (
            active.map((c) => <Pill key={c.id} color={c.color}>{c.icon} {c.name}</Pill>)
          )}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 13 }}>
        <StatTile label="Auto Posts" value={posts.filter((p) => p.auto).length} color={C.supra} />
        <StatTile label="SUPRA / Cycle" value={fmt(wallet.costPerPost)} color={C.accent} />
        <StatTile label="Total Spent" value={fmt(stats.supraEarned)} color={C.warn} />
        <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <Card eyebrow="Schedule" title="Cycle Settings">
          <Select
            value={automation.cycleSeconds}
            onChange={(e) => saveAutomationSettings({ cycleSeconds: Number(e.target.value) })}
            disabled={automation.running}
            style={{ marginBottom: 13 }}
          >
            <option value={30}>30 seconds (test)</option>
            <option value={3600}>1 hour</option>
            <option value={10800}>3 hours</option>
            <option value={21600}>6 hours</option>
            <option value={43200}>12 hours</option>
            <option value={86400}>24 hours</option>
          </Select>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 15px" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>Auto-approve posts</div>
              <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 3 }}>Publishes without review</div>
            </div>
            <Switch checked={automation.autoApprove} onChange={(v) => saveAutomationSettings({ autoApprove: v })} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 15px", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>🖼 Generate image per post</div>
              <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 3 }}>AI creates a visual for every automated post</div>
            </div>
            <Switch checked={!!automation.withImage} onChange={(v) => saveAutomationSettings({ withImage: v })} />
          </div>
          {automation.withImage && (
            <div className="fade-up" style={{ marginTop: 10 }}>
              <Select value={automation.imageStyle || "auto"} onChange={(e) => saveAutomationSettings({ imageStyle: e.target.value })} disabled={automation.running}>
                {[["auto","Auto — AI decides"],["cyberpunk","Cyberpunk"],["photorealistic","Photorealistic"],["minimal","Minimalist"],["abstract","Abstract"],["infographic","Data / Infographic"],["retro","Retro Futurism"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
          )}
        </Card>


      </div>
    </div>
  );
}
