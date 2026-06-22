import { useState } from "react";
import { C } from "../theme";
import { Btn, Card, StatTile } from "../components/ui";
import { ChannelResultsRow } from "../components/ui";

export function HistoryPage({ isMobile, posts, stats, clearHistory }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>History</div>
            <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>All generated posts — per-channel publish status included.</div>
          </div>
          {posts.length > 0 && (
            <Btn variant="danger" size="sm" onClick={clearHistory}>Clear all</Btn>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 13 }}>
        <StatTile label="Total Posts" value={stats.totalPosts} color={C.supra} />
        <StatTile label="Generated" value={stats.totalGenerations} color={C.accent2} />
        <StatTile label="Auto Posted" value={posts.filter((p) => p.auto).length} color={C.accent} />
        <StatTile label="SUPRA Spent" value={Number(stats.supraEarned ?? 0).toFixed(2)} color={C.warn} suffix=" ⬡" />
      </div>

      {posts.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "56px 28px", border: `1.5px dashed ${C.border}`, background: "transparent" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.3 }}>📋</div>
          <div style={{ fontSize: "0.86rem", color: C.muted }}>No posts yet — generate one from the Generate tab</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {posts.map((post, i) => {
            const open = expanded === i;
            const channelEntries = Object.entries(post.channelResults || {});
            const postedChannels = channelEntries.filter(([, r]) => r?.ok).length;
            return (
              <div
                key={post.id || i}
                className="fade-up"
                style={{
                  background: `linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%)`,
                  border: `1px solid ${post.posted ? C.border : C.border}`, borderRadius: 14,
                  overflow: "hidden", transition: "border-color 0.2s",
                }}
              >
                <div
                  onClick={() => setExpanded(open ? null : i)}
                  style={{ cursor: "pointer", padding: "15px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: post.posted ? C.supra : C.muted, boxShadow: post.posted ? `0 0 6px ${C.supra}` : "none", marginTop: 5 }} />
                  {post.imageUrl && (
                    <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                      <img src={post.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.84rem", lineHeight: 1.55, color: C.text, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: open ? "unset" : 2, WebkitBoxOrient: "vertical", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {post.text}
                    </div>
                    <div style={{ display: "flex", gap: 9, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "0.66rem", color: C.muted, fontFamily: C.mono }}>{new Date(post.time).toLocaleString()}</span>
                      {post.auto && <span style={{ fontSize: "0.64rem", color: C.accent, background: `${C.accent}1a`, border: `1px solid ${C.accent}33`, borderRadius: 20, padding: "2px 8px" }}>auto</span>}
                      {post.avgScore > 0 && <span style={{ fontSize: "0.64rem", color: post.avgScore >= 8 ? C.supra : C.warn, fontFamily: C.mono }}>⭐ {post.avgScore.toFixed(1)}/10</span>}
                      {channelEntries.length > 0 && <span style={{ fontSize: "0.66rem", color: C.text2 }}>{postedChannels}/{channelEntries.length} published</span>}
                    </div>
                    {channelEntries.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <ChannelResultsRow channelResults={post.channelResults} />
                      </div>
                    )}
                  </div>
                  <span style={{ color: C.muted, fontSize: "0.8rem", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {posts.length > 0 && isMobile && (
        <Btn variant="danger" size="sm" full onClick={clearHistory}>Clear history</Btn>
      )}
    </div>
  );
}
