const crypto = require('crypto');
const { queryGet, queryRun } = require('../db/database');

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const VERIFY_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 30;

function generateToken() {
  return crypto.randomBytes(32).toString('hex'); // 64-char hex
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIp(req) {
  const raw = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:1.2.3.4 -> 1.2.3.4)
  return raw.replace(/^::ffff:/, '').slice(0, 45);
}

async function recordLogin(userId, email, success, req) {
  try {
    await queryRun(
      `INSERT INTO login_history (user_id, email, success, ip, user_agent) VALUES (?, ?, ?, ?, ?)`,
      [userId, email, success ? 1 : 0, getClientIp(req), (req.headers['user-agent'] || '').slice(0, 500)]
    );
  } catch (e) {
    console.error('[Auth] Failed to record login:', e.message);
  }
}

async function isLocked(user) {
  if (!user.locked_until) return false;
  const locked = new Date(user.locked_until).getTime();
  if (Date.now() < locked) return true;
  // Lock expired — reset
  await queryRun('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?', [user.user_id]);
  return false;
}

async function recordFailedAttempt(userId) {
  const user = await queryGet('SELECT failed_attempts FROM users WHERE user_id = ?', [userId]);
  const newCount = (user?.failed_attempts || 0) + 1;
  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await queryRun(
      'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE user_id = ?',
      [newCount, lockedUntil, userId]
    );
    return { locked: true, attempts: newCount, lockedUntil };
  }
  await queryRun('UPDATE users SET failed_attempts = ? WHERE user_id = ?', [newCount, userId]);
  return { locked: false, attempts: newCount };
}

async function clearFailedAttempts(userId) {
  await queryRun('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?', [userId]);
}

async function recordLoginSuccess(userId, req) {
  await queryRun(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE user_id = ?',
    [getClientIp(req), userId]
  );
}

async function createEmailVerification(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + VERIFY_TTL_HOURS * 3600 * 1000);
  await queryRun(
    'INSERT INTO email_verifications (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expiresAt]
  );
  return token;
}

async function consumeEmailVerification(token) {
  const row = await queryGet(
    'SELECT * FROM email_verifications WHERE token = ? AND used_at IS NULL AND expires_at > NOW()',
    [token]
  );
  if (!row) return null;
  await queryRun('UPDATE email_verifications SET used_at = NOW() WHERE token = ?', [token]);
  await queryRun('UPDATE users SET email_verified = 1 WHERE user_id = ?', [row.user_id]);
  return row.user_id;
}

async function createPasswordReset(userId) {
  // Invalidate any previous unused tokens for this user
  await queryRun('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [userId]);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
  await queryRun(
    'INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expiresAt]
  );
  return token;
}

async function consumePasswordReset(token) {
  const row = await queryGet(
    'SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > NOW()',
    [token]
  );
  if (!row) return null;
  await queryRun('UPDATE password_resets SET used_at = NOW() WHERE token = ?', [token]);
  return row.user_id;
}

module.exports = {
  generateToken,
  getClientIp,
  recordLogin,
  isLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  recordLoginSuccess,
  createEmailVerification,
  consumeEmailVerification,
  createPasswordReset,
  consumePasswordReset,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  VERIFY_TTL_HOURS,
  RESET_TTL_MINUTES,
};
