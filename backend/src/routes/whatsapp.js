const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { connectWhatsApp, disconnectWhatsApp, getWhatsAppState } = require('../services/whatsapp');

router.use(requireAuth);

// Get current user's WhatsApp status
router.get('/status', (req, res) => {
  const { status, qr } = getWhatsAppState(req.user.user_id);
  res.json({ status, qr });
});

// Get current user's QR (lazy connect if not yet started)
router.get('/qr', async (req, res) => {
  try {
    const { status, qr } = getWhatsAppState(req.user.user_id);
    if (status === 'disconnected') {
      // Lazy connect — trigger and let client poll
      connectWhatsApp(req.user.user_id).catch(e =>
        console.error(`[WhatsApp ${req.user.user_id}] Lazy connect failed:`, e.message)
      );
    }
    res.json({ status, qr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger connect (e.g. after first login)
router.post('/connect', async (req, res) => {
  try {
    await connectWhatsApp(req.user.user_id);
    res.json({ ok: true, status: getWhatsAppState(req.user.user_id).status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually disconnect — clears session and starts fresh QR
router.post('/disconnect', async (req, res) => {
  try {
    await disconnectWhatsApp(req.user.user_id);
    res.json({ ok: true, status: getWhatsAppState(req.user.user_id).status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;