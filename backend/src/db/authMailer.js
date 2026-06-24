const nodemailer = require('nodemailer');
const { queryGet } = require('../db/database');

// Per-user SMTP cache for auth emails
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAuthTransporter(userId) {
  const cached = cache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.transporter;

  const cfg = await queryGet('SELECT * FROM user_smtp WHERE user_id = ?', [userId]);
  if (!cfg) throw new Error(`No SMTP configured for user ${userId}`);

  const transporter = nodemailer.createTransport({
    host:     cfg.smtp_host,
    port:     parseInt(cfg.smtp_port, 10),
    secure:   parseInt(cfg.smtp_port, 10) === 465,
    auth:     { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
  cache.set(userId, { transporter, expiresAt: Date.now() + CACHE_TTL_MS });
  return transporter;
}

function getBaseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

function buildEmailHtml({ title, body, ctaUrl, ctaText }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0f172a;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px;color:#e2e8f0;">
    <h1 style="margin:0 0 16px;font-size:22px;color:#fff;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#cbd5e1;">${body}</div>
    ${ctaUrl ? `<div style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}" style="background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${ctaText}</a>
    </div>` : ''}
    <p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #334155;padding-top:16px;">
      This is an automated message from Dashboard Monitor. If you didn't request this, you can safely ignore it.
    </p>
  </div>
</body></html>`;
}

async function sendVerificationEmail(user, token) {
  const url = `${getBaseUrl()}/verify-email?token=${token}`;
  const html = buildEmailHtml({
    title: 'Verify your email address',
    body: `<p>Hi ${user.name || ''},</p>
           <p>Welcome to Dashboard Monitor! Please verify your email address to activate your account.</p>
           <p>This link expires in 24 hours.</p>`,
    ctaUrl: url,
    ctaText: 'Verify Email',
  });
  const transporter = await getAuthTransporter(user.user_id);
  await transporter.sendMail({
    from:    user.smtp_from || user.smtp_user,
    to:      user.email,
    subject: 'Verify your Dashboard Monitor email',
    html,
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${getBaseUrl()}/reset-password?token=${token}`;
  const html = buildEmailHtml({
    title: 'Reset your password',
    body: `<p>Hi ${user.name || ''},</p>
           <p>You (or someone with access to your account) requested a password reset.</p>
           <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
           <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
    ctaUrl: url,
    ctaText: 'Reset Password',
  });
  const transporter = await getAuthTransporter(user.user_id);
  await transporter.sendMail({
    from:    user.smtp_from || user.smtp_user,
    to:      user.email,
    subject: 'Reset your Dashboard Monitor password',
    html,
  });
}

async function sendPasswordChangedEmail(user) {
  const html = buildEmailHtml({
    title: 'Your password was changed',
    body: `<p>Hi ${user.name || ''},</p>
           <p>Your Dashboard Monitor password was just changed. If this was you, no action is needed.</p>
           <p>If you didn't do this, please reset your password immediately or contact support.</p>`,
  });
  try {
    const transporter = await getAuthTransporter(user.user_id);
    await transporter.sendMail({
      from:    user.smtp_from || user.smtp_user,
      to:      user.email,
      subject: 'Your Dashboard Monitor password was changed',
      html,
    });
  } catch (e) {
    // Non-fatal — password still changed even if notification fails
    console.error('[Auth] Failed to send password-changed notification:', e.message);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
};
