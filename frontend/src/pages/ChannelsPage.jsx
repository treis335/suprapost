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
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} onSave={onSaveChannel} onTest={onTestChannel} />
        ))}
      </div>


    </div>
  );
}
