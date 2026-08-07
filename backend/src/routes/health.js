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
    const host = process.env.DB_HOST || 'localhost';
    const name = process.env.DB_NAME || 'dashboard_monitor';
    checks.database = { status: 'ok', label: 'MySQL Database', detail: `${host}/${name}` };
  } catch (e) {
    checks.database = { status: 'error', label: 'MySQL Database', detail: e.message };
  }

  // 2. WhatsApp (per-user)
  const wa = getWhatsAppState(req.user.user_id);
  let waDetail = wa.status;
  if (wa.status === 'connected') {
    try {
      const s = await queryGet(
        'SELECT phone_number, push_name FROM whatsapp_sessions WHERE user_id = ?',
        [req.user.user_id]
      );
      if (s?.phone_number) waDetail = `Connected as ${s.push_name || s.phone_number}`;
    } catch (e) { /* keep plain status */ }
  } else if (wa.status === 'awaiting_qr') {
    waDetail = 'Awaiting QR scan — go to WhatsApp Connection';
  } else if (wa.status === 'disconnected') {
    waDetail = 'Not connected — go to WhatsApp Connection';
  }
  checks.whatsapp = {
    status: wa.status === 'connected' ? 'ok' : wa.status === 'disconnected' ? 'error' : 'warning',
    label: 'WhatsApp (Baileys)',
    detail: waDetail,
  };

  // 3. SMTP / Email (per-user)
  try {
    const smtp = await queryGet(
      'SELECT smtp_host, smtp_port, is_verified, last_error FROM user_smtp WHERE user_id = ?',
      [req.user.user_id]
    );
    if (smtp) {
      checks.smtp = {
        status: smtp.is_verified ? 'ok' : 'warning',
        label: 'Email SMTP (yours)',
        detail: smtp.is_verified
          ? `${smtp.smtp_host}:${smtp.smtp_port}`
          : `Not verified — ${smtp.last_error || 'click verify in Email Settings'}`,
      };
    } else {
      checks.smtp = { status: 'warning', label: 'Email SMTP (yours)', detail: 'Not configured — go to Email Settings' };
    }
  } catch (e) {
    checks.smtp = { status: 'error', label: 'Email SMTP (yours)', detail: e.message };
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
