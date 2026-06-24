const { queryGet, queryAll, queryRun } = require('../db/database');
const { captureAndCrop } = require('./capture');
const { extractText } = require('./ocr');
const { sendEmail } = require('./email');
const { sendWhatsApp } = require('./whatsapp');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../../data');

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
  const job = await queryGet(
    "SELECT * FROM jobs WHERE job_id = ? AND status = 'active'",
    [jobId]
  );
  if (!job) return null;

  const lastHistory = await queryGet(
    'SELECT ocr_text FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 1',
    [jobId]
  );

  const items = await queryAll(
    'SELECT * FROM job_items WHERE job_id = ? ORDER BY sort_order, item_id',
    [jobId]
  );

  let screenshotPath  = null;
  let screenshotPaths = [];
  let ocrText         = null;
  let changedFlag     = 0;
  let deliveryStatus  = 'pending';
  let errorMessage    = null;

  try {
    if (items.length > 0) {
      // Multi-URL mode
      const parts = [];
      screenshotPaths = [];
      for (const item of items) {
        const shot = await captureAndCrop(
          job.job_id, item.target_url,
          item.crop_x, item.crop_y, item.crop_width, item.crop_height,
        );
        const text  = await extractText(shot);
        const label = item.label ? item.label : `URL ${item.sort_order + 1}`;
        parts.push(`=== ${label} ===\n${text}`);
        screenshotPaths.push(shot);
      }
      ocrText       = parts.join('\n\n');
      screenshotPath = screenshotPaths[0] || null;
    } else {
      // Single-URL mode
      screenshotPath  = await captureAndCrop(
        job.job_id, job.target_url,
        job.crop_x, job.crop_y, job.crop_width, job.crop_height,
      );
      ocrText         = await extractText(screenshotPath);
      screenshotPaths = screenshotPath ? [screenshotPath] : [];
    }
    changedFlag = (!lastHistory || lastHistory.ocr_text !== ocrText) ? 1 : 0;
  } catch (err) {
    errorMessage   = err.message;
    deliveryStatus = 'failed';
  }

  // Notify
  const shouldSend = !errorMessage && (changedFlag || !job.notify_only_on_change);

  if (shouldSend) {
    const recipients = await queryAll(
      'SELECT * FROM recipients WHERE job_id = ?',
      [jobId]
    );

    if (recipients.length > 0) {
      const runAt   = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const body    = buildMessage(job, ocrText, runAt);
      const allPaths = screenshotPaths.map(p => path.join(DATA_DIR, p)).filter(p => fs.existsSync(p));
      const errors  = [];

      for (const r of recipients) {
        try {
          const emailSubject = (job.notification_subject || '').trim() || job.job_name;
          if (r.type === 'email')    await sendEmail(r.value, `${emailSubject} - ${runAt.slice(0,10)}`, body, allPaths);
          if (r.type === 'whatsapp') await sendWhatsApp(job.user_id, r.value, body, allPaths);
        } catch (e) {
          errors.push(`[${r.type} → ${r.value}]: ${e.message}`);
        }
      }

      deliveryStatus = errors.length === 0 ? 'sent' : 'failed';
      if (errors.length > 0) errorMessage = errors.join(' | ');
    }
  }

  // Record history
  const result = await queryRun(`
    INSERT INTO history (job_id, screenshot_path, ocr_text, changed_flag, delivery_status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [jobId, screenshotPath, ocrText, changedFlag, deliveryStatus, errorMessage]);

  return await queryGet('SELECT * FROM history WHERE history_id = ?', [result.insertId]);
}

module.exports = { runJob };
