const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { queryGet } = require('../db/database');
const { getWhatsAppState } = require('../services/whatsapp');
const fs = require('fs');
const path = require('path');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const checks = {};

  // 1. Database (MySQL)
  try {
    await queryGet('SELECT 1');
    checks.database = { status: 'ok', label: 'MySQL Database' };
  } catch (e) {
    checks.database = { status: 'error', label: 'MySQL Database', detail: e.message };
  }

  // 2. WhatsApp
  const wa = getWhatsAppState();
  checks.whatsapp = {
    status: wa.status === 'connected' ? 'ok' : wa.status === 'awaiting_qr' ? 'warning' : 'error',
    label: 'WhatsApp (Baileys)',
    detail: wa.status,
  };

  // 3. SMTP / Email
  if (process.env.SMTP_HOST) {
    checks.smtp = { status: 'ok', label: 'Email SMTP', detail: `${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}` };
  } else {
    checks.smtp = { status: 'warning', label: 'Email SMTP', detail: 'Not configured' };
  }

  // 4. Playwright
  try {
    require.resolve('playwright');
    checks.playwright = { status: 'ok', label: 'Playwright (Screenshot)', detail: 'Installed' };
  } catch {
    checks.playwright = { status: 'error', label: 'Playwright (Screenshot)', detail: 'Not installed' };
  }

  // 5. Data directory
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../../data');
  try {
    fs.accessSync(dataDir, fs.constants.W_OK);
    checks.storage = { status: 'ok', label: 'Data Directory', detail: dataDir };
  } catch {
    checks.storage = { status: 'error', label: 'Data Directory', detail: 'Not writable' };
  }

  // 6. Scheduler
  const { getScheduledJobIds } = require('../scheduler');
  const scheduledIds = getScheduledJobIds();
  checks.scheduler = {
    status: 'ok',
    label: 'Scheduler (node-cron)',
    detail: `${scheduledIds.length} job(s) active`,
  };

  // 7. Ollama (async — finalize after)
  fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`)
    .then(r => r.json())
    .then(data => {
      const model = process.env.OLLAMA_VISION_MODEL || 'minicpm-v4.6';
      const hasModel = data.models && data.models.some(m =>
        m.name === model || m.name.startsWith(model.split(':')[0])
      );
      checks.ollama = {
        status: hasModel ? 'ok' : 'warning',
        label: 'Ollama OCR',
        detail: hasModel ? `Model: ${model}` : `Model ${model} not found`,
      };
      finalize();
    })
    .catch(() => {
      checks.ollama = { status: 'error', label: 'Ollama OCR', detail: 'Server not running' };
      finalize();
    });

  function finalize() {
    const allOk = Object.values(checks).every(c => c.status === 'ok');
    const hasWarning = Object.values(checks).some(c => c.status === 'warning');
    res.json({
      overall: allOk ? 'ok' : hasWarning ? 'warning' : 'error',
      checks,
    });
  }
});

module.exports = router;
