const router = require('express').Router();
const { queryGet, queryAll } = require('../db/database');
const requireAuth = require('../middleware/auth');
const { runJob, isRunning } = require('../services/runner');

router.use(requireAuth);

// Manual trigger. Capture + OCR takes minutes, so the run is fired in the
// background and answered immediately — holding the connection open makes the
// reverse proxy give up with a 504 even though the run itself succeeds.
// Clients poll /run-status for the outcome.
router.post('/:id/run', async (req, res) => {
  const job = await queryGet(
    'SELECT status FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'active') {
    return res.status(409).json({ error: 'Job is paused — activate it first' });
  }

  const jobId = Number(req.params.id);
  const already = isRunning(jobId);

  runJob(jobId).catch(err => console.error(`[Run] Job ${jobId} failed:`, err.message));

  res.status(202).json({ status: 'running', already });
});

// Poll target for a run started above
router.get('/:id/run-status', async (req, res) => {
  const job = await queryGet(
    'SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    running: isRunning(req.params.id),
    last_run: await queryGet(
      'SELECT * FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 1',
      [req.params.id]
    ),
  });
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
