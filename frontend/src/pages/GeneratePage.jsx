import { useState } from "react";
import { C, fmt } from "../theme";
import { Btn, Card, Field, Input, Log, ScoreBar, Select, TextArea, TweetPreview, ChannelResultsRow } from "../components/ui";

export function GeneratePage({
  isMobile, settings, updateSetting, saveSettings, wallet,
  generating, handleGenerate, tweet, scores, genLog,
  editing, editText, setEditing, setEditText, setTweet,
  channels, onPost,
}) {
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);

  const targets = channels.filter((c) => c.enabled && c.configured && !c.comingSoon);

  async function handlePostClick() {
    setPosting(true);
    setPostResult(null);
    const result = await onPost(editing ? editText : tweet);
    setPostResult(result?.post || null);
    setPosting(false);
  }

  function handleRegenerate() {
    setPostResult(null);
    handleGenerate();
  }

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Generate Post</div>
            <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>The AI generates, self-critiques, then waits for your approval.</div>
          </div>
        )}
        <Card eyebrow="Generation" title="Options">
          <Field label="Custom prompt" hint="Leave blank to use your profile automatically">
            <Input placeholder="Optional..." value={settings.customPrompt} onChange={(e) => updateSetting("customPrompt", e.target.value)} onBlur={saveSettings} />
          </Field>
          <Field label="Post type">
            <Select value={settings.postType} onChange={(e) => updateSetting("postType", e.target.value)} onBlur={saveSettings}>
              <option value="alpha">Alpha / Insight</option>
              <option value="thread">Thread Opener</option>
              <option value="news">News Commentary</option>
              <option value="educational">Educational</option>
              <option value="engagement">Engagement</option>
            </Select>
          </Field>
          <Btn full variant="primary" size="lg" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : `✦ Generate Post — ${fmt(wallet.costPerPost)} SUPRA`}
          </Btn>
        </Card>
        <Card eyebrow="Pipeline" title="Generation Log">
          <Log lines={genLog} />
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {tweet ? (
          <>
            {scores.length > 0 && (
              <Card eyebrow="Quality Gate" title="Self-Critique" accentTop={C.accent}>
                {scores.map((sc) => <ScoreBar key={sc.label} {...sc} />)}
              </Card>
            )}
            <Card
              eyebrow="Preview"
              title="Post"
              right={
                <span style={{ fontSize: "0.68rem", color: C.muted }}>
                  will post to {targets.length === 0 ? "no channels yet" : targets.map((t) => t.icon).join(" ")}
                </span>
              }
            >
              <TweetPreview text={editing ? editText : tweet} via={targets.length ? targets.map((t) => t.name).join(" + ") : "SupraPost"} />

              {targets.length === 0 && (
                <div style={{ marginTop: 12, fontSize: "0.74rem", color: C.warn, background: `${C.warn}14`, border: `1px solid ${C.warn}40`, borderRadius: 8, padding: "9px 12px" }}>
                  No channel is enabled yet — head to the <strong>Channels</strong> tab to connect one before posting.
                </div>
              )}

              <div style={{ display: "flex", gap: 9, marginTop: 16, flexWrap: "wrap" }}>
                <Btn variant="supra" style={{ flex: 1 }} onClick={handlePostClick} disabled={posting || targets.length === 0}>
                  {posting ? "Posting..." : "🚀 Post Now"}
                </Btn>
                <Btn variant="ghost" onClick={handleRegenerate} disabled={generating}>↻ Regenerate</Btn>
                <Btn variant="cyan" onClick={() => { setEditing((e) => !e); setEditText(tweet); }}>Edit</Btn>
              </div>

              {editing && (
                <div className="fade-up" style={{ marginTop: 14 }}>
                  <TextArea value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Btn variant="supra" size="sm" onClick={() => { setTweet(editText); setEditing(false); }}>Apply</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
                  </div>
                </div>
              )}

              {postResult?.channelResults && (
                <div className="pop-in" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Publish results</div>
                  <ChannelResultsRow channelResults={postResult.channelResults} />
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card style={{ textAlign: "center", padding: "56px 28px", border: `1.5px dashed ${C.border}`, background: "transparent" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: 0.4 }}>✦</div>
            <div style={{ fontSize: "0.86rem", color: C.muted }}>Your generated post will appear here</div>
          </Card>
        )}
      </div>
    </div>
  );
}
