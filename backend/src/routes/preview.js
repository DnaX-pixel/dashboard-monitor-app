const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { capturePreview } = require('../services/capture');

router.post('/', requireAuth, async (req, res) => {
  const { target_url } = req.body;
  if (!target_url) return res.status(400).json({ error: 'target_url required' });
  try {
    const rel = await capturePreview(req.user.user_id, target_url);
    res.json({ screenshot_url: `/static/${rel}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
