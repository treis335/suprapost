import { C } from "../../theme";
import { Card, StatTile } from "../ui";

export function RightPanel({ stats, settings, posts }) {
  return (
    <div style={{ borderLeft: `1px solid ${C.border}`, padding: 22, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
      <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Overview</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        <StatTile label="Posts" value={stats.totalPosts} color={C.accent} />
        <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
      </div>

      <div style={{ height: 1, background: C.border, margin: "5px 0" }} />

      <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Active Profile</div>
      <Card>
        {[["Niche", settings.niche || "—"], ["Tone", settings.tone], ["Audience", settings.audience || "—"]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9, gap: 8 }}>
            <span style={{ fontSize: "0.74rem", color: C.muted, flexShrink: 0 }}>{l}</span>
            <span style={{ fontSize: "0.74rem", color: C.text, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </Card>

      {posts.length > 0 && (
        <>
          <div style={{ height: 1, background: C.border, margin: "5px 0" }} />
          <div style={{ fontSize: "0.64rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Latest Post</div>
          <Card style={{ fontSize: "0.76rem", color: C.text2, lineHeight: 1.6 }}>
            {posts[0].text.substring(0, 110)}{posts[0].text.length > 110 ? "..." : ""}
          </Card>
        </>
      )}
    </div>
  );
}
