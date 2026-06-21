const router = require('express').Router();
const { queryGet, queryAll } = require('../db/database');
const requireAuth = require('../middleware/auth');
const { runJob } = require('../services/runner');

router.use(requireAuth);

// Manual trigger
router.post('/:id/run', async (req, res) => {
  const job = await queryGet(
    'SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const history = await runJob(Number(req.params.id));
  if (!history) return res.status(409).json({ error: 'Job is paused — activate it first' });

  res.status(201).json(history);
});

// List history for a job (latest 50)
router.get('/:id/history', async (req, res) => {
  const job = await queryGet(
    'SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json(
    await queryAll(
      'SELECT * FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 50',
      [req.params.id]
    )
  );
});

module.exports = router;
