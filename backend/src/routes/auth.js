const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { queryAll, queryGet, queryRun } = require('../db/database');
const requireAuth = require('../middleware/auth');
const {
  isLocked, recordFailedAttempt, clearFailedAttempts,
  recordLogin, recordLoginSuccess,
  createEmailVerification, consumeEmailVerification,
  createPasswordReset, consumePasswordReset,
  MAX_FAILED_ATTEMPTS, RESET_TTL_MINUTES,
} = require('../db/auth');
const {
  sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
} = require('../db/authMailer');

// Rate limiters for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function issueToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, failed_attempts, locked_until, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = await queryRun(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email.toLowerCase(), hash]
    );
    const user = await queryGet(
      'SELECT user_id, name, email, is_admin, email_verified, created_at FROM users WHERE user_id = ?',
      [result.insertId]
    );

    // Generate verification token + try to email
    let verificationSent = false;
    try {
      const token = await createEmailVerification(user.user_id);
      const fullUser = await queryGet('SELECT * FROM users WHERE user_id = ?', [user.user_id]);
      await sendVerificationEmail(fullUser, token);
      verificationSent = true;
    } catch (e) {
      console.error('[Auth] Failed to send verification email:', e.message);
    }

    const token = issueToken(user);
    res.status(201).json({
      token,
      user,
      verificationSent,
      message: verificationSent
        ? 'Account created. Check your email (from your dashboard SMTP) for the verification link.'
        : 'Account created. Email verification unavailable — configure your SMTP at /email to enable it.',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await queryGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!user) {
    await recordLogin(null, email.toLowerCase(), false, req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (await isLocked(user)) {
    await recordLogin(user.user_id, user.email, false, req);
    return res.status(423).json({
      error: `Account locked due to too many failed attempts. Try again in 15 minutes.`,
    });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    const result = await recordFailedAttempt(user.user_id);
    await recordLogin(user.user_id, user.email, false, req);
    return res.status(401).json({
      error: result.locked
        ? 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        : `Invalid credentials. ${MAX_FAILED_ATTEMPTS - result.attempts} attempts remaining.`,
    });
  }

  await clearFailedAttempts(user.user_id);
  await recordLoginSuccess(user.user_id, req);
  await recordLogin(user.user_id, user.email, true, req);

  const token = issueToken(user);
  res.json({
    token,
    user: publicUser(user),
    warning: !user.email_verified ? 'Please verify your email address.' : null,
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await queryGet(
    `SELECT user_id, name, email, is_admin, email_verified, last_login_at, last_login_ip, created_at
     FROM users WHERE user_id = ?`,
    [req.user.user_id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  const userId = await consumeEmailVerification(token);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired verification link' });
  res.json({ ok: true, message: 'Email verified successfully' });
});

// POST /api/auth/resend-verification (auth required)
router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await queryGet('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });
  try {
    const token = await createEmailVerification(user.user_id);
    await sendVerificationEmail(user, token);
    res.json({ ok: true, message: 'Verification email sent' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send verification email: ' + e.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const user = await queryGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  // Always respond OK to prevent email enumeration
  if (!user) return res.json({ ok: true, message: 'If the email exists, a reset link has been sent.' });

  try {
    const token = await createPasswordReset(user.user_id);
    await sendPasswordResetEmail(user, token);
    res.json({ ok: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (e) {
    console.error('[Auth] Forgot password email failed:', e.message);
    // Still respond OK to prevent enumeration
    res.json({ ok: true, message: 'If the email exists, a reset link has been sent.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const userId = await consumePasswordReset(token);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired reset link' });

  const hash = bcrypt.hashSync(password, 10);
  await queryRun('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE user_id = ?', [hash, userId]);

  const user = await queryGet('SELECT * FROM users WHERE user_id = ?', [userId]);
  await sendPasswordChangedEmail(user);

  res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
});

// POST /api/auth/change-password (auth required)
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  const user = await queryGet('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (current_password === new_password) {
    return res.status(400).json({ error: 'New password must be different from current password' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  await queryRun('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, user.user_id]);
  await sendPasswordChangedEmail(user);
  res.json({ ok: true, message: 'Password changed successfully' });
});

// PUT /api/auth/profile (auth required) — update name
router.put('/profile', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (name.length > 100) return res.status(400).json({ error: 'name too long' });
  await queryRun('UPDATE users SET name = ? WHERE user_id = ?', [name.trim(), req.user.user_id]);
  const user = await queryGet(
    'SELECT user_id, name, email, is_admin, email_verified, last_login_at, last_login_ip, created_at FROM users WHERE user_id = ?',
    [req.user.user_id]
  );
  res.json(user);
});

// GET /api/auth/login-history (auth required)
router.get('/login-history', requireAuth, async (req, res) => {
  const rows = await queryAll(
    `SELECT id, email, success, ip, user_agent, created_at
     FROM login_history WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 20`,
    [req.user.user_id]
  );
  res.json(rows);
});

module.exports = router;
