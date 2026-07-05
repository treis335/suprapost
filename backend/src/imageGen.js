/**
 * imageGen.js — Image generation via ModelsLab API
 *
 * API docs: https://modelslab.com/api/v7/images/text-to-image
 *
 * Cost strategy:
 *   - Always 1 sample per call
 *   - Low inference steps (20–28)
 *   - Cheap models by default (flux-schnell first, SDXL fallback)
 *   - 768×768 default (square — best for Twitter/Instagram)
 *   - modo_economico forces the cheapest possible config
 *
 * Interface is identical to the previous Together AI version —
 * engine.js requires zero changes.
 */

const axios  = require("axios");
const fs     = require("fs");
const path   = require("path");
const { v4: uuidv4 } = require("uuid");

const IMAGES_DIR = path.join(__dirname, "..", "data", "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ── Model catalogue — cheapest first ────────────────────────────────────────
const MODELS = {
  "flux-schnell":   { id: "flux-schnell",            steps: 20, guidance: 5,   label: "Flux Schnell (fastest)" },
  "sdxl-lightning": { id: "sdxl",                    steps: 20, guidance: 5,   label: "SDXL Lightning" },
  "flux-dev":       { id: "flux",                    steps: 25, guidance: 6,   label: "Flux Dev" },
  "realistic":      { id: "realistic-vision-v51",    steps: 28, guidance: 7,   label: "Realistic Vision" },
  "dreamshaper":    { id: "dreamshaper-v8",           steps: 25, guidance: 6,   label: "Dreamshaper v8" },
};

const DEFAULT_MODEL   = "flux-schnell";
const FALLBACK_MODEL  = "sdxl-lightning";

// ── Style presets — appended to every prompt ─────────────────────────────────
const STYLES = {
  auto: {
    label: "Auto (AI decides)",
    suffix: "Cinematic composition, ultra-sharp, professional lighting, trending on Artstation.",
  },
  cyberpunk: {
    label: "Cyberpunk",
    suffix: "Cyberpunk aesthetic, neon-lit city, holographic glows, deep violet and electric cyan, cinematic, ultra-detailed.",
  },
  photorealistic: {
    label: "Photorealistic",
    suffix: "Hyperrealistic photography, DSLR, natural light, 8K resolution.",
  },
  minimal: {
    label: "Minimalist",
    suffix: "Clean minimalist design, white space, geometric shapes, flat vector style, modern typography.",
  },
  abstract: {
    label: "Abstract",
    suffix: "Abstract digital art, fluid gradients, particle systems, iridescent colours, depth and movement.",
  },
  infographic: {
    label: "Data / Infographic",
    suffix: "Modern infographic illustration, clean data visualisation, dark background, glowing accent lines.",
  },
  retro: {
    label: "Retro Futurism",
    suffix: "Retro-futurism, 80s synthwave, chrome typography, starfield, vivid pink and teal.",
  },
};

// ── Prompt builder — uses DeepSeek to turn post text into a visual prompt ───
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
            content:
              `Post:\n"${postText}"\n\n` +
              "Create an image generation prompt that visually represents the core idea of this post. " +
              "Make it striking and relevant to crypto / Web3 / blockchain if applicable.",
          },
        ],
        max_tokens: 120,
        temperature: 0.88,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 12000,
      }
    );
    const prompt = res.data.choices[0].message.content.trim();
    return `${prompt} ${styleSuffix}`.trim();
  } catch (e) {
    console.warn("[imageGen] DeepSeek prompt build failed:", e.message, "— using fallback prompt");
    return fallback;
  }
}

// ── ModelsLab API call — single attempt ─────────────────────────────────────
async function callModelsLab(prompt, modelKey, opts = {}) {
  const apiKey = process.env.MODELSLAB_API_KEY;
  if (!apiKey) throw new Error("MODELSLAB_API_KEY not set");

  const model      = MODELS[modelKey] || MODELS[DEFAULT_MODEL];
  const economyMode = opts.modo_economico ?? false;

  const payload = {
    key:                   apiKey,
    model_id:              opts.model_id || model.id,
    prompt,
    negative_prompt:
      opts.negative_prompt ||
      "text, watermark, logo, blurry, deformed, ugly, duplicate, bad anatomy, disfigured, worst quality, low quality",
    width:                 String(economyMode ? 512 : (opts.width  || 768)),
    height:                String(economyMode ? 512 : (opts.height || 768)),
    samples:               "1",
    num_inference_steps:   String(economyMode ? 20  : (opts.steps  || model.steps)),
    guidance_scale:        economyMode ? 5 : (opts.guidance || model.guidance),
    safety_checker:        "no",
    multi_lingual:         "no",
    panorama:              "no",
    self_attention:        "no",
    upscale:               "no",
    embeddings_model:      null,
    lora_model:            null,
    tomesd:                "yes",     // speed optimisation
    clip_skip:             "2",
    use_karras_sigmas:     "yes",
    scheduler:             "DPMSolverMultistepScheduler",
    webhook:               null,
    track_id:              null,
  };

  const res = await axios.post(
    "https://modelslab.com/api/v7/images/text-to-image",
    payload,
    {
      headers: { "Content-Type": "application/json" },
      timeout: 90000,   // ModelsLab can be slow on cold start
    }
  );

  return res.data;
}

// ── Download image from URL and save to disk ─────────────────────────────────
async function downloadAndSave(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
  const filename  = `${uuidv4()}.jpg`;
  const imagePath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(imagePath, Buffer.from(res.data));
  return { filename, imagePath };
}

// ── Main generateImage — called by engine.js ─────────────────────────────────
/**
 * @param {object} params
 * @param {string}  params.postText         — source text for auto-prompting
 * @param {string}  [params.style]          — style preset key
 * @param {string}  [params.customPrompt]   — skip auto-prompting if set
 * @param {number}  [params.width]
 * @param {number}  [params.height]
 * @param {string}  [params.model_id]       — override model
 * @param {boolean} [params.modo_economico] — force cheapest settings
 *
 * @returns {{ ok, imagePath, imageFilename, prompt, error?, simulated? }}
 */
async function generateImage({
  postText = "",
  style = "auto",
  customPrompt = "",
  width,
  height,
  model_id,
  modo_economico = false,
}) {
  if (!process.env.MODELSLAB_API_KEY) {
    console.warn("[imageGen] MODELSLAB_API_KEY not set — skipping image generation");
    return { ok: false, simulated: true, error: "MODELSLAB_API_KEY not set" };
  }

  const prompt = await buildImagePrompt(postText, style, customPrompt);
  console.log(`[imageGen] Prompt: "${prompt.slice(0, 90)}…"`);

  const opts = { width, height, model_id, modo_economico };
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const modelKey = attempt === 1 ? DEFAULT_MODEL : FALLBACK_MODEL;

    try {
      console.log(`[imageGen] Attempt ${attempt}/${MAX_RETRIES} — model: ${MODELS[modelKey]?.label}`);
      const data = await callModelsLab(prompt, modelKey, opts);

      // ── Response shapes ModelsLab can return ──────────────────────────
      // status: "success" → output[] has URLs
      // status: "processing" → fetch_result_url for polling
      // status: "error" → message has the error

      if (data.status === "error") {
        throw new Error(data.message || "ModelsLab API error");
      }

      if (data.status === "processing") {
        // Poll for result (max 60s)
        console.log("[imageGen] Processing — polling for result...");
        const fetchUrl = data.fetch_result_url;
        let pollData;
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const poll = await axios.post(fetchUrl, { key: process.env.MODELSLAB_API_KEY }, { timeout: 15000 });
          pollData = poll.data;
          console.log(`[imageGen] Poll ${i + 1}: status=${pollData.status}`);
          if (pollData.status === "success") break;
          if (pollData.status === "error") throw new Error(pollData.message || "Poll error");
        }
        data.output = pollData?.output;
      }

      const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!imageUrl) throw new Error("No output URL in response");

      console.log(`[imageGen] Downloading from ${imageUrl.slice(0, 60)}…`);
      const { filename, imagePath } = await downloadAndSave(imageUrl);
      console.log(`[imageGen] Saved → ${filename}`);

      return { ok: true, imagePath, imageFilename: filename, prompt };

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      console.error(`[imageGen] Attempt ${attempt} failed:`, msg);
      if (attempt === MAX_RETRIES) {
        return { ok: false, error: msg, prompt };
      }
      // Short pause before retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ── Save user-uploaded image (unchanged from previous version) ───────────────
function saveUploadedImage(b64Data, mimeType = "image/jpeg") {
  const ext      = mimeType.includes("png") ? "png" : mimeType.includes("gif") ? "gif" : "jpg";
  const filename  = `${uuidv4()}.${ext}`;
  const imagePath = path.join(IMAGES_DIR, filename);
  const base64    = b64Data.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(imagePath, Buffer.from(base64, "base64"));
  console.log(`[imageGen] Upload saved → ${filename}`);
  return { ok: true, imagePath, imageFilename: filename, prompt: "user-uploaded" };
}

// ── Cleanup old images ────────────────────────────────────────────────────────
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
