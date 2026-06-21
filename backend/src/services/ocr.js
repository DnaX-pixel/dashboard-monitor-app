const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../../data');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'minicpm-v4.6';

const OCR_PROMPT = `You are an OCR specialist. Extract ALL text from this image as accurately as possible.

Rules:
- Output plain text only, no commentary, no preamble, no labels
- Preserve the original table structure: one row per line, separate columns with " | "
- Read numbers, dates, and project IDs exactly as shown
- If text is unclear, write [unclear] for that part
- Skip decorative elements (icons, status dots, etc.)
- Preserve reading order (left-to-right, top-to-bottom)`;

async function queryOllama(imagePath) {
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      prompt: OCR_PROMPT,
      images: [imageBase64],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return (data.response || '').trim();
}

async function extractText(relativeScreenshotPath) {
  const absPath = path.join(DATA_DIR, relativeScreenshotPath);

  // Quick health check
  try {
    const healthRes = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!healthRes.ok) throw new Error('Ollama not responding');
  } catch (e) {
    throw new Error(`Ollama not running at ${OLLAMA_URL}. Start it with: ollama serve`);
  }

  return await queryOllama(absPath);
}

module.exports = { extractText };