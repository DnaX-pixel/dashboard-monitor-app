const router = require('express').Router();
const db = require('../db/database');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

function ownsJob(jobId, userId) {
  return db.prepare('SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?').get([jobId, userId]);
}

router.get('/:jobId/recipients', (req, res) => {
  if (!ownsJob(req.params.jobId, req.user.user_id)) return res.status(404).json({ error: 'Job not found' });
  res.json(db.prepare('SELECT * FROM recipients WHERE job_id = ?').all([req.params.jobId]));
});

router.post('/:jobId/recipients', (req, res) => {
  if (!ownsJob(req.params.jobId, req.user.user_id)) return res.status(404).json({ error: 'Job not found' });
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'type and value are required' });
  if (!['email', 'whatsapp'].includes(type)) return res.status(400).json({ error: 'type must be email or whatsapp' });

  const result = db.prepare('INSERT INTO recipients (job_id, type, value) VALUES (?, ?, ?)').run([req.params.jobId, type, value]);
  res.status(201).json(db.prepare('SELECT * FROM recipients WHERE recipient_id = ?').get([result.lastInsertRowid]));
});

router.delete('/:jobId/recipients/:rid', (req, res) => {
  if (!ownsJob(req.params.jobId, req.user.user_id)) return res.status(404).json({ error: 'Job not found' });
  const result = db.prepare('DELETE FROM recipients WHERE recipient_id = ? AND job_id = ?').run([req.params.rid, req.params.jobId]);
  if (result.changes === 0) return res.status(404).json({ error: 'Recipient not found' });
  res.status(204).end();
});

module.exports = router;
