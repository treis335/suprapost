import { useState } from "react";
import { C, fmt } from "../theme";
import { Btn, Card, Field, Input, Log, ScoreBar, Select, TextArea, TweetPreview, ChannelResultsRow, ImagePanel } from "../components/ui";

export function GeneratePage({
  isMobile, settings, updateSetting, saveSettings, wallet,
  generating, handleGenerate, tweet, setTweet, scores, genLog,
  editing, editText, setEditing, setEditText,
  channels, onPost,
}) {
  // Image state — controlled by ImagePanel, consumed here
  const [imageState, setImageState] = useState({ mode: "off", imageFilename: null, imageUrl: null });
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);

  const targets = channels.filter((c) => c.enabled && c.configured && !c.comingSoon);
  const hasImage = imageState.mode !== "off" && !!imageState.imageFilename;

  // When the user clicks "Generate Post", also reset any pending image
  function onGenerate() {
    setImageState({ mode: imageState.mode, imageFilename: null, imageUrl: null });
    setPostResult(null);
    handleGenerate();
  }

  async function handlePostClick() {
    setPosting(true);
    setPostResult(null);
    const text = editing ? editText : tweet;
    const result = await onPost(text, imageState.imageFilename || null);
    setPostResult(result?.post || null);
    setPosting(false);
  }

  // Preview panel: show image beside or above post text
  const previewText = editing ? editText : tweet;

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, alignItems: "start" }}>

      {/* ── Left column: controls ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {!isMobile && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Generate Post</div>
            <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 5 }}>AI writes, self-critiques, adds an image — then waits for your call.</div>
          </div>
        )}

        <Card eyebrow="Generation" title="Options">
          <Field label="Custom prompt" hint="Leave blank to use your saved profile">
            <Input placeholder="Optional override..." value={settings.customPrompt} onChange={(e) => updateSetting("customPrompt", e.target.value)} onBlur={saveSettings} />
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
          <Btn full variant="primary" size="lg" onClick={onGenerate} disabled={generating}>
            {generating ? "Generating..." : `✦ Generate Post — ${fmt(wallet.costPerPost)} SUPRA`}
          </Btn>
        </Card>

        {/* Image Panel — visible regardless of whether a post exists yet */}
        <ImagePanel
          postText={tweet}
          onChange={setImageState}
          compact={isMobile}
        />

        <Card eyebrow="Pipeline" title="Generation Log">
          <Log lines={genLog} />
        </Card>
      </div>

      {/* ── Right column: preview + actions ── */}
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
                  {targets.length === 0 ? "no channels yet" : targets.map((t) => t.icon).join(" ")}
                  {hasImage ? " · 🖼 with image" : ""}
                </span>
              }
            >
              {/* Image thumbnail above text preview if image ready */}
              {hasImage && (
                <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", maxHeight: 200 }}>
                  <img src={imageState.imageUrl} alt="Preview" style={{ width: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}

              <TweetPreview
                text={previewText}
                via={targets.length ? targets.map((t) => t.name).join(" + ") : "SupraPost"}
              />

              {targets.length === 0 && (
                <div style={{ marginTop: 12, fontSize: "0.74rem", color: C.warn, background: `${C.warn}14`, border: `1px solid ${C.warn}40`, borderRadius: 8, padding: "9px 12px" }}>
                  No channel enabled yet — go to <strong>Channels</strong> to connect one.
                </div>
              )}

              <div style={{ display: "flex", gap: 9, marginTop: 16, flexWrap: "wrap" }}>
                <Btn variant="supra" style={{ flex: 1 }} onClick={handlePostClick} disabled={posting || targets.length === 0}>
                  {posting ? "Posting..." : hasImage ? "🚀 Post with Image" : "🚀 Post Now"}
                </Btn>
                <Btn variant="ghost" onClick={onGenerate} disabled={generating}>↻</Btn>
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
            <div style={{ fontSize: "0.86rem", color: C.muted }}>Generated post appears here</div>
            <div style={{ fontSize: "0.74rem", color: C.muted, marginTop: 6 }}>You can also set up an image above — it stays ready for when the post is generated</div>
          </Card>
        )}
      </div>
    </div>
  );
}
