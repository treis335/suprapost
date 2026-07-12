/**
 * imageGen.js — Image generation via Together AI (FLUX.1-schnell)
 */

const axios  = require("axios");
const fs     = require("fs");
const path   = require("path");
const { v4: uuidv4 } = require("uuid");

const IMAGES_DIR = path.join(__dirname, "..", "data", "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ── Style presets ─────────────────────────────────────────────────────────────
const STYLES = {
  auto:          { label: "Auto (AI decides)",    suffix: "Cinematic composition, ultra-sharp, professional lighting, trending on Artstation." },
  cyberpunk:     { label: "Cyberpunk",            suffix: "Cyberpunk aesthetic, neon-lit city, holographic glows, deep violet and electric cyan, cinematic, ultra-detailed." },
  photorealistic:{ label: "Photorealistic",       suffix: "Hyperrealistic photography, DSLR, natural light, 8K resolution." },
  minimal:       { label: "Minimalist",           suffix: "Clean minimalist design, white space, geometric shapes, flat vector style, modern typography." },
  abstract:      { label: "Abstract",             suffix: "Abstract digital art, fluid gradients, particle systems, iridescent colours, depth and movement." },
  infographic:   { label: "Data / Infographic",   suffix: "Modern infographic illustration, clean data visualisation, dark background, glowing accent lines." },
  retro:         { label: "Retro Futurism",       suffix: "Retro-futurism, 80s synthwave, chrome typography, starfield, vivid pink and teal." },
};

// ── Prompt builder ────────────────────────────────────────────────────────────
async function buildImagePrompt(postText, style = "auto", customPrompt = "") {
  if (customPrompt) return `${customPrompt} ${STYLES[style]?.suffix || ""}`.trim();

  const apiKey     = process.env.DEEPSEEK_API_KEY;
  const styleSuffix = STYLES[style]?.suffix || STYLES.auto.suffix;
  const fallback   = `Futuristic blockchain network visualization, glowing nodes, data streams, dark background with purple and cyan highlights. ${styleSuffix}`;

  if (!apiKey) return fallback;

  try {
    const res = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a visual art director specialising in social media content for crypto and Web3. " +
              "Convert a social media post into a concise, vivid image generation prompt. " +
              "Rules: max 80 words, return ONLY the prompt (no quotes, no explanation), " +
              "no text inside the image, strong composition, colours that pop on mobile screens.",
          },
          {
            role: "user",
            content: `Post:\n"${postText}"\n\nCreate an image generation prompt that visually represents the core idea of this post.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.88,
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        timeout: 12000,
      }
    );
    const prompt = res.data.choices[0].message.content.trim();
    return `${prompt} ${styleSuffix}`.trim();
  } catch (e) {
    console.warn("[imageGen] DeepSeek prompt build failed:", e.message);
    return fallback;
  }
}

// ── Together AI ───────────────────────────────────────────────────────────────
async function generateWithTogether(prompt) {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) throw new Error("TOGETHER_API_KEY not set");

  let res;
  try {
    res = await axios.post(
      "https://api.together.xyz/v1/images/generations",
      {
        model:           "black-forest-labs/FLUX.1-schnell",
        prompt,
        width:           768,
        height:          768,
        steps:           4,
        n:               1,
        response_format: "b64_json",
      },
      {
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        timeout: 60000,
      }
    );
  } catch (err) {
    // Surface Together's actual error body (e.g. bad model id, invalid
    // params, quota) instead of just the generic axios status message.
    const detail = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data;
    throw new Error(detail ? `Together AI: ${JSON.stringify(detail)}` : err.message);
  }

  const b64 = res.data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data in Together AI response");

  // Save to disk
  const filename  = `${uuidv4()}.jpg`;
  const imagePath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(imagePath, Buffer.from(b64, "base64"));
  return { filename, imagePath };
}

// ── Main generateImage ────────────────────────────────────────────────────────
async function generateImage({ postText = "", style = "auto", customPrompt = "", modo_economico = false }) {
  const hasTogether = !!process.env.TOGETHER_API_KEY;

  if (!hasTogether) {
    console.warn("[imageGen] No TOGETHER_API_KEY set — skipping");
    return { ok: false, simulated: true, error: "No image API key configured" };
  }

  const prompt = await buildImagePrompt(postText, style, customPrompt);
  console.log(`[imageGen] Prompt: "${prompt.slice(0, 90)}…"`);

  try {
    console.log("[imageGen] Generating via Together AI (FLUX.1-schnell)...");
    const { filename, imagePath } = await generateWithTogether(prompt);
    console.log(`[imageGen] Together AI success → ${filename}`);
    return { ok: true, imagePath, imageFilename: filename, prompt };
  } catch (err) {
    console.error("[imageGen] Together AI failed:", err.message);
    return { ok: false, error: err.message, prompt };
  }
}

// ── User upload ───────────────────────────────────────────────────────────────
function saveUploadedImage(b64Data, mimeType = "image/jpeg") {
  const ext      = mimeType.includes("png") ? "png" : mimeType.includes("gif") ? "gif" : "jpg";
  const filename  = `${uuidv4()}.${ext}`;
  const imagePath = path.join(IMAGES_DIR, filename);
  const base64    = b64Data.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(imagePath, Buffer.from(base64, "base64"));
  console.log(`[imageGen] Upload saved → ${filename}`);
  return { ok: true, imagePath, imageFilename: filename, prompt: "user-uploaded" };
}

function cleanOldImages(maxAgeDays = 7) {
  try {
    const cutoff = Date.now() - maxAgeDays * 86400 * 1000;
    for (const f of fs.readdirSync(IMAGES_DIR)) {
      const fp = path.join(IMAGES_DIR, f);
      if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
    }
  } catch {}
}

module.exports = { generateImage, saveUploadedImage, cleanOldImages, STYLES, IMAGES_DIR };
