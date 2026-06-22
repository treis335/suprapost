const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const IMAGES_DIR = path.join(__dirname, "..", "data", "images");

fs.mkdirSync(IMAGES_DIR, { recursive: true });

/* ── Style presets ───────────────────────────────────────────────────────────
   Each style adds a visual language on top of the AI-generated prompt so the
   user can choose a vibe without writing anything themselves.
   The "auto" style asks DeepSeek to craft the visual prompt from scratch based
   on the post text — best default for most crypto/Web3 content.
───────────────────────────────────────────────────────────────────────────── */
const STYLES = {
  auto: {
    label: "Auto (AI decides)",
    suffix: "Cinematic composition, ultra-sharp, professional photography lighting, trending on Artstation.",
  },
  cyberpunk: {
    label: "Cyberpunk",
    suffix: "Cyberpunk aesthetic, neon-lit city, holographic glows, deep violet and electric cyan palette, cinematic, ultra-detailed.",
  },
  photorealistic: {
    label: "Photorealistic",
    suffix: "Hyperrealistic photography, DSLR, natural light, 8K, shot on Sony A7 IV.",
  },
  minimal: {
    label: "Minimalist",
    suffix: "Clean minimalist design, white space, geometric shapes, flat vector style, modern Swiss typography influence.",
  },
  abstract: {
    label: "Abstract",
    suffix: "Abstract digital art, fluid gradients, particle systems, iridescent colours, depth and movement.",
  },
  infographic: {
    label: "Data / Infographic",
    suffix: "Modern infographic illustration, clean data visualisation aesthetic, dark background, glowing accent lines.",
  },
  retro: {
    label: "Retro Futurism",
    suffix: "Retro-futurism, 80s synthwave aesthetic, chrome typography, starfield, vivid pink and teal, pixel-art accents.",
  },
};

/**
 * Uses DeepSeek (or a fast fallback) to turn raw post text into an
 * optimised visual prompt for the image generator.
 */
async function buildImagePrompt(postText, style = "auto", customPrompt = "") {
  if (customPrompt) return `${customPrompt} ${STYLES[style]?.suffix || ""}`.trim();

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const styleSuffix = STYLES[style]?.suffix || STYLES.auto.suffix;

  const fallback = `Futuristic blockchain network visualization, glowing nodes, data streams, dark background with purple and cyan highlights. ${styleSuffix}`;

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
              "You are a visual art director. Convert social media posts into concise, vivid image generation prompts. Return ONLY the prompt — no explanation, no quotes, max 80 words. Focus on visual metaphors that represent the post's core idea.",
          },
          {
            role: "user",
            content: `Post:\n"${postText}"\n\nCreate an image prompt for this post. Make it visually striking and relevant to crypto / Web3 / blockchain if the post is about that topic.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.9,
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        timeout: 12000,
      }
    );
    const prompt = res.data.choices[0].message.content.trim();
    return `${prompt} ${styleSuffix}`.trim();
  } catch {
    return fallback;
  }
}

/**
 * Generates an image using Together AI's FLUX.1-schnell-Free model.
 *
 * Returns { ok, imagePath, imageFilename, prompt } on success.
 * Returns { ok: false, error, prompt } on failure.
 *
 * Persists the image to backend/data/images/{uuid}.jpg so it can be:
 *  - served via Express static (/images/<filename>)
 *  - read as a Buffer and sent to Telegram / Discord / Twitter
 */
async function generateImage({ postText, style = "auto", customPrompt = "", width = 1024, height = 1024 }) {
  const apiKey = process.env.TOGETHER_API_KEY;

  const prompt = await buildImagePrompt(postText, style, customPrompt);
  console.log(`[imageGen] Prompt: "${prompt.slice(0, 80)}..."`);

  if (!apiKey) {
    console.warn("[imageGen] No TOGETHER_API_KEY — returning placeholder");
    return { ok: false, simulated: true, prompt, error: "TOGETHER_API_KEY not set" };
  }

  try {
    const res = await axios.post(
      "https://api.together.xyz/v1/images/generations",
      {
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        width,
        height,
        steps: 4,
        n: 1,
        response_format: "b64_json",
      },
      {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        timeout: 60000,
      }
    );

    const b64 = res.data?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image data in response");

    const filename = `${uuidv4()}.jpg`;
    const imagePath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(imagePath, Buffer.from(b64, "base64"));
    console.log(`[imageGen] Saved → ${filename}`);

    return { ok: true, imagePath, imageFilename: filename, prompt };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error("[imageGen] Error:", msg);
    return { ok: false, error: msg, prompt };
  }
}

/**
 * Saves a user-uploaded image (base64 string) to disk.
 * Returns the same shape as generateImage() so callers are uniform.
 */
function saveUploadedImage(b64Data, mimeType = "image/jpeg") {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("gif") ? "gif" : "jpg";
  const filename = `${uuidv4()}.${ext}`;
  const imagePath = path.join(IMAGES_DIR, filename);
  const base64 = b64Data.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(imagePath, Buffer.from(base64, "base64"));
  console.log(`[imageGen] Upload saved → ${filename}`);
  return { ok: true, imagePath, imageFilename: filename, prompt: "user-uploaded" };
}

/**
 * Cleans up image files older than `maxAgeDays` to avoid disk bloat.
 * Called once at server startup.
 */
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
