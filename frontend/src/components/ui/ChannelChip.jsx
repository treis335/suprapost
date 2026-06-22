import { C } from "../../theme";

const CHANNEL_META = {
  telegram: { icon: "✈", name: "Telegram", color: "#34b7eb" },
  discord: { icon: "🎮", name: "Discord", color: "#5865F2" },
  twitter: { icon: "𝕏", name: "X", color: "#1d9bf0" },
  instagram: { icon: "📷", name: "Instagram", color: "#E1306C" },
};

/** A small chip showing the outcome of publishing to one social network. */
export function ChannelChip({ channelId, result }) {
  const meta = CHANNEL_META[channelId] || { icon: "●", name: channelId, color: C.muted };
  const ok = result?.ok;
  const simulated = result?.simulated;
  const color = ok ? C.supra : simulated ? C.muted : C.danger;
  const label = ok ? "posted" : simulated ? "not configured" : "failed";

  return (
    <span title={result?.error || ""} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: "0.7rem", padding: "4px 10px 4px 6px", borderRadius: 20,
      background: `${meta.color}14`, border: `1px solid ${meta.color}38`, color: C.text2,
    }}>
      <span style={{ fontSize: "0.78rem" }}>{meta.icon}</span>
      {meta.name}
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ color, fontFamily: C.mono, fontSize: "0.64rem" }}>{label}</span>
    </span>
  );
}

/** Renders a row of ChannelChips from a post's channelResults map. */
export function ChannelResultsRow({ channelResults }) {
  const entries = Object.entries(channelResults || {});
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {entries.map(([channelId, result]) => (
        <ChannelChip key={channelId} channelId={channelId} result={result} />
      ))}
    </div>
  );
}

export { CHANNEL_META };
