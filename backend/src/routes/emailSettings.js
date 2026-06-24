const router = require('express').Router();
const { queryGet, queryRun } = require('../db/database');
const requireAuth = require('../middleware/auth');
const { verifyUserSmtp, invalidateCache } = require('../services/email');

router.use(requireAuth);

// GET /api/email/settings — get current user's SMTP config (password masked)
router.get('/', async (req, res) => {
  const row = await queryGet(
    'SELECT user_id, smtp_host, smtp_port, smtp_user, smtp_from, use_tls, is_verified, last_error, updated_at FROM user_smtp WHERE user_id = ?',
    [req.user.user_id]
  );
  if (!row) return res.json({ configured: false });
  res.json({ configured: true, ...row });
});

// PUT /api/email/settings — save SMTP config
router.put('/', async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, use_tls } = req.body;
  if (!smtp_host || !smtp_user || !smtp_pass || !smtp_from) {
    return res.status(400).json({ error: 'smtp_host, smtp_user, smtp_pass, smtp_from are required' });
  }

  await queryRun(
    `INSERT INTO user_smtp (user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, use_tls, is_verified, last_error, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       smtp_host = VALUES(smtp_host),
       smtp_port = VALUES(smtp_port),
       smtp_user = VALUES(smtp_user),
       smtp_pass = VALUES(smtp_pass),
       smtp_from = VALUES(smtp_from),
       use_tls = VALUES(use_tls),
       is_verified = 0,
       last_error = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [
      req.user.user_id,
      smtp_host,
      parseInt(smtp_port, 10) || 587,
      smtp_user,
      smtp_pass,
      smtp_from,
      use_tls !== false ? 1 : 0,
    ]
  );
  invalidateCache(req.user.user_id);
  res.json({ ok: true });
});

// POST /api/email/settings/verify — test SMTP connection
router.post('/verify', async (req, res) => {
  const result = await verifyUserSmtp(req.user.user_id);
  await queryRun(
    'UPDATE user_smtp SET is_verified = ?, last_error = ? WHERE user_id = ?',
    [result.ok ? 1 : 0, result.ok ? null : result.error, req.user.user_id]
  );
  if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
  res.json({ ok: true });
});

// DELETE /api/email/settings — remove SMTP config
router.delete('/', async (req, res) => {
  await queryRun('DELETE FROM user_smtp WHERE user_id = ?', [req.user.user_id]);
  invalidateCache(req.user.user_id);
  res.json({ ok: true });
});

module.exports = router;