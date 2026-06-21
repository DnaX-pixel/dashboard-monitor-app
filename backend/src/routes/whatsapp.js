const router = require('express').Router();
const { queryGet } = require('../db/database');
const requireAuth = require('../middleware/auth');
const { connectWhatsApp, disconnectWhatsApp, getWhatsAppState } = require('../services/whatsapp');

router.use(requireAuth);

async function requireAdmin(req, res, next) {
  const user = await queryGet('SELECT is_admin FROM users WHERE user_id = ?', [req.user.user_id]);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// Any authenticated user can check status
router.get('/status', (req, res) => {
  const { status } = getWhatsAppState();
  res.json({ status });
});

// Admin only: get QR data URL to display for scanning
router.get('/qr', requireAdmin, (req, res) => {
  const { status, qr } = getWhatsAppState();
  res.json({ status, qr });
});

// Admin only: manually trigger reconnect
router.post('/connect', requireAdmin, async (req, res) => {
  try {
    await connectWhatsApp();
    res.json({ ok: true, status: getWhatsAppState().status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin only: manually disconnect WhatsApp
router.post('/disconnect', requireAdmin, async (req, res) => {
  try {
    await disconnectWhatsApp();
    res.json({ ok: true, status: getWhatsAppState().status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;