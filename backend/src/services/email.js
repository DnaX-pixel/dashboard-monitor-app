const nodemailer = require('nodemailer');
const { queryGet } = require('../db/database');

// Cache: userId -> { transporter, smtpConfig, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getUserSmtp(userId) {
  if (!cache.has(userId)) return null;
  const entry = cache.get(userId);
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry;
}

async function loadUserSmtp(userId) {
  const row = await queryGet(
    'SELECT * FROM user_smtp WHERE user_id = ?',
    [userId]
  );
  return row || null;
}

function buildTransporter(cfg) {
  return nodemailer.createTransport({
    host:     cfg.smtp_host,
    port:     parseInt(cfg.smtp_port, 10),
    secure:   parseInt(cfg.smtp_port, 10) === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    tls: cfg.use_tls ? {} : { rejectUnauthorized: false },
  });
}

async function getTransporter(userId) {
  const cached = getUserSmtp(userId);
  if (cached) return cached.transporter;

  const cfg = await loadUserSmtp(userId);
  if (!cfg) throw new Error(`SMTP not configured for user ${userId}`);

  const transporter = buildTransporter(cfg);
  cache.set(userId, { transporter, smtpConfig: cfg, expiresAt: Date.now() + CACHE_TTL_MS });
  return transporter;
}

function invalidateCache(userId) {
  cache.delete(userId);
}

async function verifyUserSmtp(userId) {
  try {
    const transporter = await getTransporter(userId);
    await transporter.verify();
    return { ok: true };
  } catch (e) {
    invalidateCache(userId);
    return { ok: false, error: e.message };
  }
}

async function sendEmail(userId, to, subject, text, attachments) {
  const cfg = await loadUserSmtp(userId);
  if (!cfg) throw new Error(`SMTP not configured for user ${userId}`);

  const mailOpts = {
    from:    cfg.smtp_from || cfg.smtp_user,
    to,
    subject,
    text,
  };

  if (attachments) {
    const paths = Array.isArray(attachments) ? attachments : [attachments];
    mailOpts.attachments = paths.map((p, i) => ({
      filename: paths.length > 1 ? `screenshot_${i + 1}.png` : 'screenshot.png',
      path: p,
    }));
  }

  try {
    const transporter = await getTransporter(userId);
    await transporter.sendMail(mailOpts);
  } catch (e) {
    invalidateCache(userId);
    throw e;
  }
}

module.exports = { sendEmail, verifyUserSmtp, invalidateCache };
