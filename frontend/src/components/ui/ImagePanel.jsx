import { useRef, useState } from "react";
import { C } from "../../theme";
import { Btn } from "./Btn";
import { Select } from "./Inputs";
import { Field, Input } from "./Inputs";
import { Card } from "./Card";

/* ============================================================
   IMAGE PANEL
   Self-contained widget with 3 modes:
     - off:      no image (just text post)
     - generate: AI generates from post text (FLUX via Together AI)
     - upload:   user drops / picks their own file
   Emits onChange({ mode, imageFilename, imageUrl, imageStyle, imageCustomPrompt })
   to the parent so the parent controls what gets sent to /api/post.
============================================================ */

const MODE_ICONS = { off: "⊘", generate: "✦ AI", upload: "⬆" };

export function ImagePanel({ postText, onChange, compact = false }) {
  const [mode, setMode] = useState("off");
  const [style, setStyle] = useState("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null); // { url, filename }
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  function selectMode(m) {
    setMode(m);
    setPreview(null);
    setError(null);
    if (m === "off") onChange({ mode: "off", imageFilename: null, imageUrl: null });
  }

  async function handleGenerate() {
    if (!postText) { setError("Generate a post first, then create an image for it."); return; }
    setGenerating(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, style, customPrompt: customPrompt || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setPreview({ url: data.imageUrl, filename: data.imageFilename });
        onChange({ mode: "generate", imageFilename: data.imageFilename, imageUrl: data.imageUrl, imageStyle: style, imageCustomPrompt: customPrompt });
      } else if (data.simulated) {
        setError("TOGETHER_API_KEY not set — add it to backend/.env to enable AI images.");
      } else {
        setError(data.error || "Image generation failed.");
      }
    } catch (e) {
      setError(e.message);
    }
    setGenerating(false);
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please pick an image file (JPG, PNG, GIF, WebP)."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image too large — max 10 MB."); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result;
      try {
        const res = await fetch("/api/image/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: b64, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.ok) {
          setPreview({ url: data.imageUrl, filename: data.imageFilename });
          onChange({ mode: "upload", imageFilename: data.imageFilename, imageUrl: data.imageUrl });
        } else {
          setError(data.error || "Upload failed.");
        }
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const STYLES_LIST = [
    { id: "auto", label: "Auto — AI decides" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "photorealistic", label: "Photorealistic" },
    { id: "minimal", label: "Minimalist" },
    { id: "abstract", label: "Abstract" },
    { id: "infographic", label: "Data / Infographic" },
    { id: "retro", label: "Retro Futurism" },
  ];

  return (
    <Card eyebrow="Visual" title="Post Image" accentTop={mode !== "off" ? C.accent2 : undefined} style={{ padding: compact ? 16 : 20 }}>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: C.bg, borderRadius: 10, padding: 4 }}>
        {[["off", "No Image"], ["generate", "AI Generate"], ["upload", "Upload"]].map(([m, label]) => (
          <button key={m} onClick={() => selectMode(m)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 7, outline: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
            background: mode === m ? `linear-gradient(135deg, ${C.accent}33, ${C.accent2}22)` : "transparent",
            color: mode === m ? C.text : C.muted,
            transition: "all 0.18s",
          }}>
            <span style={{ marginRight: 5 }}>{MODE_ICONS[m]}</span>{label}
          </button>
        ))}
      </div>

      {/* ── AI Generate mode ── */}
      {mode === "generate" && (
        <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Visual style">
            <Select value={style} onChange={(e) => { setStyle(e.target.value); setPreview(null); }}>
              {STYLES_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Custom prompt (optional)" hint="Leave blank — the AI crafts the perfect prompt from your post text">
            <Input
              placeholder="e.g. golden blockchain, sunrise, epic composition..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </Field>
          <Btn variant="cyan" full onClick={handleGenerate} disabled={generating || !postText}>
            {generating
              ? <><SpinnerIcon /> Generating image...</>
              : preview ? "✦ Regenerate" : "✦ Generate Image"}
          </Btn>
          {!postText && <div style={{ fontSize: "0.72rem", color: C.warn }}>Generate a post first, then create an image for it.</div>}
        </div>
      )}

      {/* ── Upload mode ── */}
      {mode === "upload" && (
        <div className="fade-up">
          <div
            onClick={() => fileRef.current.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{
              border: `2px dashed ${dragOver ? C.accent : C.borderLight}`, borderRadius: 12,
              padding: "32px 20px", textAlign: "center", cursor: "pointer",
              background: dragOver ? `${C.accent}0a` : "transparent",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>🖼</div>
            <div style={{ fontSize: "0.8rem", color: C.text2 }}>Drop an image here, or <span style={{ color: C.accent }}>click to browse</span></div>
            <div style={{ fontSize: "0.66rem", color: C.muted, marginTop: 6 }}>JPG, PNG, GIF, WebP · max 10 MB</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="pop-in" style={{ marginTop: 12, fontSize: "0.74rem", padding: "9px 12px", borderRadius: 8, background: `${C.danger}14`, border: `1px solid ${C.danger}40`, color: C.danger }}>
          ✕ {error}
        </div>
      )}

      {/* ── Preview ── */}
      {preview && (
        <div className="fade-up" style={{ marginTop: 14, position: "relative" }}>
          <img
            src={preview.url}
            alt="Post image preview"
            style={{ width: "100%", borderRadius: 10, border: `1px solid ${C.border}`, display: "block", maxHeight: 320, objectFit: "cover" }}
          />
          <button
            onClick={() => { setPreview(null); onChange({ mode, imageFilename: null, imageUrl: null }); }}
            style={{
              position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
              background: "rgba(0,0,0,0.7)", border: `1px solid ${C.border}`, color: C.text,
              cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
          <div style={{ marginTop: 8, fontSize: "0.68rem", color: C.supra, fontFamily: C.mono }}>✓ Image ready — will be attached to the post</div>
        </div>
      )}
    </Card>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spinSlow 0.8s linear infinite", display: "inline" }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" />
    </svg>
  );
}
