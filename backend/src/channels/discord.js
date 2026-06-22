const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

function isConfigured(creds = {}) {
  return !!creds.webhookUrl;
}

async function publish({ text, imagePath, mode }, creds) {
  if (!isConfigured(creds)) return { ok: false, simulated: true, reason: "not_configured" };
  const { webhookUrl } = creds;

  try {
    const hasImage = (mode === "image" || mode === "both") && imagePath && fs.existsSync(imagePath);

    if (hasImage) {
      const form = new FormData();
      const payload = mode === "both" && text ? { content: `📢 **New Post**\n\n${text}` } : {};
      form.append("payload_json", JSON.stringify(payload));
      form.append("file", fs.createReadStream(imagePath), { filename: "image.jpg", contentType: "image/jpeg" });
      await axios.post(webhookUrl, form, { headers: form.getHeaders(), timeout: 30000 });
    } else {
      await axios.post(webhookUrl, { content: `📢 **New Post**\n\n${text}` }, { timeout: 15000 });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message || err.message };
  }
}

module.exports = { id: "discord", isConfigured, publish };
