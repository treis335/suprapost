import { useEffect, useState } from "react";
import { C, fmt } from "../theme";
import {
  Btn, Card, Field, Input, Log, ScoreBar, Select,
  TextArea, TweetPreview, ChannelResultsRow, ImagePanel, Switch, Pill,
} from "../components/ui";

/* ============================================================
   COMPOSE PAGE — the full composer.
   The user controls everything:
     1. Content mode  — Text / Image / Text + Image
     2. Text source   — Write manually  OR  Generate with AI
     3. Image source  — Upload file     OR  Generate with AI
     4. Channels      — pick which platforms get this post
     5. Preview       — see it before sending
     6. Post          — one click
============================================================ */

const MODES = [
  { id: "text",  icon: "📝", label: "Text Only" },
  { id: "image", icon: "🖼",  label: "Image Only" },
  { id: "both",  icon: "✦",  label: "Text + Image" },
];

export function ComposePage({
  isMobile,
  wallet,
  settings,
  updateSetting,
  saveSettings,
  channels,
  generating,
  handleGenerate,
  tweet,
  setTweet,
  scores,
  genLog,
  onPost,
}) {
  /* ── Compose state ─────────────────────────────────────── */
  const [mode, setMode]         = useState("text");
  const [manualText, setManualText] = useState("");
  const [useAiText, setUseAiText]   = useState(true);
  const [imageState, setImageState] = useState({ mode: "off", imageFilename: null, imageUrl: null });

  /* ── Channel target selector ───────────────────────────── */
  // by default, all configured+enabled channels are targeted
  const configuredChannels = channels.filter(
    (c) => c.enabled && c.configured && !c.comingSoon
  );
  const [targetIds, setTargetIds] = useState(null); // null = all enabled
  useEffect(() => { setTargetIds(null); }, [channels]);

  function toggleTarget(id) {
    if (targetIds === null) {
      // first manual pick: start from all, then remove this one
      setTargetIds(configuredChannels.map((c) => c.id).filter((i) => i !== id));
    } else if (targetIds.includes(id)) {
      setTargetIds(targetIds.filter((i) => i !== id));
    } else {
      setTargetIds([...targetIds, id]);
    }
  }

  function isTargeted(id) {
    return targetIds === null || targetIds.includes(id);
  }

  /* ── Post result ───────────────────────────────────────── */
  const [posting, setPosting]       = useState(false);
  const [postResult, setPostResult] = useState(null);

  /* ── Derived text (AI or manual) ───────────────────────── */
  const text = (mode === "image") ? null
             : useAiText ? tweet
             : manualText;

  const hasText  = !!text?.trim();
  const hasImage = imageState.mode !== "off" && !!imageState.imageFilename;

  /* ── Validation ────────────────────────────────────────── */
  const readyToPost =
    (mode === "text"  &&  hasText)              ||
    (mode === "image" &&  hasImage)             ||
    (mode === "both"  &&  hasText && hasImage);

  /* ── Generate (AI text) ─────────────────────────────────── */
  function onGenerate() {
    setPostResult(null);
    handleGenerate();
  }

  /* ── Post ───────────────────────────────────────────────── */
  async function handlePost() {
    if (!readyToPost) return;
    setPosting(true);
    setPostResult(null);
    const finalTargetIds = (targetIds && targetIds.length > 0) ? targetIds : null;
    const result = await onPost({
      text:          mode !== "image" ? text : null,
      imageFilename: mode !== "text"  ? imageState.imageFilename : null,
      mode,
      targetIds:     finalTargetIds,
    });
    setPostResult(result?.post || null);
    setPosting(false);
  }

  /* ── Reset on mode change ──────────────────────────────── */
  function switchMode(m) {
    setMode(m);
    setPostResult(null);
    // When switching to "image", AI text doesn't apply
    if (m === "image") setUseAiText(false);
    else               setUseAiText(true);
  }

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div className="fade-up" style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 20,
      alignItems: "start",
    }}>

      {/* ══════════════════════ LEFT COLUMN ════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Title */}
        {!isMobile && (
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, fontFamily: C.display, letterSpacing: "-0.02em" }}>Compose</div>
            <div style={{ fontSize: "0.85rem", color: C.muted, marginTop: 4 }}>
              You choose everything — content type, source, channels.
            </div>
          </div>
        )}

        {/* ── 1. CONTENT MODE ── */}
        <Card eyebrow="Step 1" title="What are you posting?">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {MODES.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => switchMode(id)}
                style={{
                  padding: "14px 8px", borderRadius: 12, border: `1px solid ${mode === id ? C.accent : C.border}`,
                  background: mode === id ? `linear-gradient(135deg,${C.accent}22,${C.accent2}11)` : C.raised,
                  cursor: "pointer", color: mode === id ? C.text : C.text2, transition: "all 0.18s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{icon}</span>
                <span style={{ fontSize: "0.74rem", fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ── 2. TEXT SECTION ── */}
        {(mode === "text" || mode === "both") && (
          <Card eyebrow="Step 2" title="Text" accentTop={C.accent} className="fade-up">
            {/* Toggle: write manually vs AI generate */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
                          background: C.bg, borderRadius: 10, padding: "11px 14px", border: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>AI Generate</div>
                <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 2 }}>
                  {useAiText ? "DeepSeek writes the post" : "You write manually below"}
                </div>
              </div>
              <Switch checked={useAiText} onChange={setUseAiText} />
            </div>

            {useAiText ? (
              /* AI branch */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Type">
                    <Select value={settings.postType} onChange={(e) => { updateSetting("postType", e.target.value); saveSettings(); }}>
                      <option value="alpha">Alpha / Insight</option>
                      <option value="thread">Thread Opener</option>
                      <option value="news">News Commentary</option>
                      <option value="educational">Educational</option>
                      <option value="engagement">Engagement</option>
                    </Select>
                  </Field>
                  <Field label="Tone">
                    <Select value={settings.tone} onChange={(e) => { updateSetting("tone", e.target.value); saveSettings(); }}>
                      <option value="technical">Technical</option>
                      <option value="casual">Casual</option>
                      <option value="hype">Hype / Bullish</option>
                      <option value="educational">Educational</option>
                      <option value="alpha">Alpha</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Custom prompt (optional)">
                  <Input
                    placeholder="Leave blank to use your saved profile…"
                    value={settings.customPrompt}
                    onChange={(e) => updateSetting("customPrompt", e.target.value)}
                    onBlur={saveSettings}
                  />
                </Field>
                <Btn full variant="primary" onClick={onGenerate} disabled={generating}>
                  {generating ? "Generating…" : `✦ Generate — ${fmt(wallet.costPerPost)} SUPRA`}
                </Btn>
                {tweet && (
                  <div style={{ fontSize: "0.7rem", color: C.supra, marginTop: 2 }}>
                    ✓ Text ready — preview on the right
                  </div>
                )}
              </div>
            ) : (
              /* Manual branch */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <TextArea
                  placeholder="Write your post here…"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  style={{ minHeight: 110 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "0.68rem", color: manualText.length > 280 ? C.danger : C.muted, fontFamily: C.mono }}>
                    {manualText.length} / 280
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── 3. IMAGE SECTION ── */}
        {(mode === "image" || mode === "both") && (
          <div className="fade-up">
            <ImagePanel
              eyebrow={mode === "both" ? "Step 3" : "Step 2"}
              postText={tweet || manualText}
              onChange={setImageState}
              compact={isMobile}
              forceOpen={true}
            />
          </div>
        )}

        {/* ── 4. AI LOG ── */}
        {(mode === "text" || mode === "both") && useAiText && genLog.length > 0 && (
          <Card eyebrow="Pipeline" title="Generation Log">
            <Log lines={genLog} />
          </Card>
        )}
      </div>

      {/* ══════════════════════ RIGHT COLUMN ════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── CHANNEL SELECTOR ── */}
        <Card eyebrow={mode === "both" ? "Step 4" : mode === "image" ? "Step 3" : "Step 3"} title="Where to post">
          {configuredChannels.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: C.warn }}>
              No channels configured yet — go to the <strong>Channels</strong> tab first.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: 4 }}>
                Toggle to select which platforms receive this post
              </div>
              {configuredChannels.map((ch) => {
                const on = isTargeted(ch.id);
                return (
                  <div
                    key={ch.id}
                    onClick={() => toggleTarget(ch.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                      background: on ? `${ch.color}12` : C.raised,
                      border: `1px solid ${on ? ch.color + "44" : C.border}`,
                      transition: "all 0.18s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.1rem" }}>{ch.icon}</span>
                      <span style={{ fontSize: "0.86rem", fontWeight: 600, color: on ? C.text : C.text2 }}>{ch.name}</span>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: on ? `linear-gradient(135deg,${C.accent},${C.accentDeep})` : C.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.6rem", color: "#fff", transition: "all 0.2s",
                    }}>
                      {on ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
              {targetIds !== null && targetIds.length === 0 && (
                <div style={{ fontSize: "0.72rem", color: C.danger }}>
                  Select at least one channel to post.
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── QUALITY SCORES (AI text only) ── */}
        {scores.length > 0 && useAiText && (mode === "text" || mode === "both") && (
          <Card eyebrow="Quality Gate" title="Self-Critique" accentTop={C.accent}>
            {scores.map((sc) => <ScoreBar key={sc.label} {...sc} />)}
          </Card>
        )}

        {/* ── PREVIEW + POST BUTTON ── */}
        <Card
          eyebrow="Preview"
          title={mode === "text" ? "Post" : mode === "image" ? "Image" : "Post + Image"}
          accentTop={readyToPost ? C.supra : undefined}
          right={readyToPost ? <Pill color={C.supra} dot>Ready</Pill> : null}
        >
          {/* Image preview */}
          {(mode === "image" || mode === "both") && hasImage && (
            <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: mode === "both" ? 12 : 0, maxHeight: 240 }}>
              <img src={imageState.imageUrl} alt="Preview" style={{ width: "100%", objectFit: "cover", display: "block" }} />
            </div>
          )}

          {/* Text preview */}
          {(mode === "text" || mode === "both") && hasText && (
            <TweetPreview
              text={text}
              via={
                (targetIds === null ? configuredChannels : configuredChannels.filter((c) => targetIds.includes(c.id)))
                  .map((c) => c.name).join(" + ") || "SupraPost"
              }
            />
          )}

          {/* Empty state */}
          {!readyToPost && (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontSize: "0.84rem" }}>
              {mode === "text"  && "Generate or write text to preview"}
              {mode === "image" && "Upload or generate an image to preview"}
              {mode === "both"  && (!hasText ? "Start by adding text" : "Now add an image")}
            </div>
          )}

          {/* POST BUTTON */}
          <div style={{ marginTop: 16 }}>
            <Btn
              full
              variant={readyToPost ? "supra" : "ghost"}
              size="lg"
              onClick={handlePost}
              disabled={posting || !readyToPost || (targetIds !== null && targetIds.length === 0)}
            >
              {posting ? "Posting…" : (
                mode === "text"  ? "🚀 Post Text" :
                mode === "image" ? "🚀 Post Image" :
                                   "🚀 Post Text + Image"
              )}
            </Btn>
          </div>

          {/* Results */}
          {postResult?.results && (
            <div className="pop-in" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Publish results
              </div>
              <ChannelResultsRow channelResults={postResult.results} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
