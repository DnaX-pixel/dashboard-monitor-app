const db = require('../db/database');
const { captureAndCrop } = require('./capture');
const { extractText } = require('./ocr');
const { sendEmail } = require('./email');
const { sendWhatsApp } = require('./whatsapp');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../../data');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMessage(job, ocrText, runAt) {
  const d = new Date(runAt + 'Z');
  const dateStr = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const subject = (job.notification_subject || '').trim() || job.job_name;
  return [
    `Dear Recipient,`,
    ``,
    `${subject} - ${dateStr}`,
    ``,
    ocrText,
    ``,
    `Thank you`,
  ].join('\n');
}

async function runJob(jobId) {
  const job = db.prepare("SELECT * FROM jobs WHERE job_id = ? AND status = 'active'").get([jobId]);
  if (!job) return null;

  const lastHistory = db.prepare(
    'SELECT ocr_text FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 1'
  ).get([jobId]);

  // Check if job has multi-URL items
  const items = db.prepare('SELECT * FROM job_items WHERE job_id = ? ORDER BY sort_order, item_id').all([jobId]);

  let screenshotPath = null;
  let screenshotPaths = [];  // all screenshots (multi-URL)
  let ocrText        = null;
  let changedFlag    = 0;
  let deliveryStatus = 'pending';
  let errorMessage   = null;

  try {
    if (items.length > 0) {
      // Multi-URL mode: capture each item, combine OCR text
      const parts = [];
      screenshotPaths = [];
      for (const item of items) {
        const shot = await captureAndCrop(
          job.job_id, item.target_url,
          item.crop_x, item.crop_y, item.crop_width, item.crop_height,
        );
        const text = await extractText(shot);
        const label = item.label ? item.label : `URL ${item.sort_order + 1}`;
        parts.push(`=== ${label} ===\n${text}`);
        screenshotPaths.push(shot);
      }
      ocrText = parts.join('\n\n');
      screenshotPath = screenshotPaths[0] || null;  // first for history record
    } else {
      // Single-URL mode (backward compatible)
      screenshotPath = await captureAndCrop(
        job.job_id, job.target_url,
        job.crop_x, job.crop_y, job.crop_width, job.crop_height,
      );
      ocrText = await extractText(screenshotPath);
      screenshotPaths = screenshotPath ? [screenshotPath] : [];
    }
    changedFlag = (!lastHistory || lastHistory.ocr_text !== ocrText) ? 1 : 0;
  } catch (err) {
    errorMessage   = err.message;
    deliveryStatus = 'failed';
  }

  // Step 2: notify
  const shouldSend = !errorMessage && (changedFlag || !job.notify_only_on_change);

  if (shouldSend) {
    const recipients = db.prepare('SELECT * FROM recipients WHERE job_id = ?').all([jobId]);

    if (recipients.length > 0) {
      const runAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const body  = buildMessage(job, ocrText, runAt);
      const allPaths = screenshotPaths.map(p => path.join(DATA_DIR, p)).filter(p => fs.existsSync(p));
      const errors = [];

      for (const r of recipients) {
        try {
          const emailSubject = (job.notification_subject || '').trim() || job.job_name;
          if (r.type === 'email')     await sendEmail(r.value, `${emailSubject} - ${runAt.slice(0,10)}`, body, allPaths);
          if (r.type === 'whatsapp')  await sendWhatsApp(r.value, body, allPaths);
        } catch (e) {
          errors.push(`[${r.type} → ${r.value}]: ${e.message}`);
        }
      }

      deliveryStatus = errors.length === 0 ? 'sent' : 'failed';
      if (errors.length > 0) errorMessage = errors.join(' | ');
    }
  }

  // Step 3: record
  const result = db.prepare(`
    INSERT INTO history (job_id, screenshot_path, ocr_text, changed_flag, delivery_status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run([jobId, screenshotPath, ocrText, changedFlag, deliveryStatus, errorMessage]);

  return db.prepare('SELECT * FROM history WHERE history_id = ?').get([result.lastInsertRowid]);
}

module.exports = { runJob };