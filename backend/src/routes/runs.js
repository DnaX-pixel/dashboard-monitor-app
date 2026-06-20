const router = require('express').Router();
const db = require('../db/database');
const requireAuth = require('../middleware/auth');
const { runJob } = require('../services/runner');

router.use(requireAuth);

// Manual trigger — same logic as the scheduler, but user-scoped
router.post('/:id/run', async (req, res) => {
  const job = db.prepare('SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?').get([req.params.id, req.user.user_id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const history = await runJob(Number(req.params.id));

  // runJob returns null when job is paused
  if (!history) return res.status(409).json({ error: 'Job is paused — activate it first' });

  res.status(201).json(history);
});

// List history for a job (latest 50)
router.get('/:id/history', (req, res) => {
  if (!db.prepare('SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?').get([req.params.id, req.user.user_id])) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(
    db.prepare('SELECT * FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 50').all([req.params.id])
  );
});

module.exports = router;
