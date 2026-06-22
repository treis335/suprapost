import { C } from "../theme";
import { Card } from "../components/ui";
import { ChannelCard } from "../components/channels/ChannelCard";

export function ChannelsPage({ isMobile, channels, onSaveChannel, onTestChannel }) {
  const activeCount = channels.filter((c) => c.enabled && c.configured).length;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Channels</div>
          <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>
            Connect as many networks as you want — every generated post publishes to all of the ones you enable below.
          </div>
        </div>
      )}

      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: "0.82rem", color: C.text2 }}>
          <strong style={{ color: C.text }}>{activeCount}</strong> of {channels.length} network{channels.length === 1 ? "" : "s"} active
        </div>
        <div style={{ fontSize: "0.72rem", color: C.muted }}>
          Credentials are stored on your server, never in this browser.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} onSave={onSaveChannel} onTest={onTestChannel} />
        ))}
      </div>

      <Card eyebrow="Scaling up" title="Adding a new network" style={{ background: "transparent", border: `1.5px dashed ${C.border}` }}>
        <div style={{ fontSize: "0.78rem", color: C.text2, lineHeight: 1.65 }}>
          SupraPost's publishing layer is plugin-based — each network is a small module under <code style={{ background: C.bg, padding: "2px 7px", borderRadius: 5, fontFamily: C.mono, fontSize: "0.74rem" }}>backend/src/channels/</code>. New networks show up here automatically once registered, with no other code changes required.
        </div>
      </Card>
    </div>
  );
}
