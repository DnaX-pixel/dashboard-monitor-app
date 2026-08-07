const router = require('express').Router();
const { queryAll, queryGet, queryRun } = require('../db/database');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

async function ownsJob(jobId, userId) {
  return await queryGet(
    'SELECT 1 FROM jobs WHERE job_id = ? AND user_id = ?',
    [jobId, userId]
  );
}

router.get('/:jobId/recipients', async (req, res) => {
  if (!await ownsJob(req.params.jobId, req.user.user_id)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(await queryAll('SELECT * FROM recipients WHERE job_id = ?', [req.params.jobId]));
});

router.post('/:jobId/recipients', async (req, res) => {
  if (!await ownsJob(req.params.jobId, req.user.user_id)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const { type, value, label } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'type and value are required' });
  if (!['email', 'whatsapp', 'whatsapp_group'].includes(type)) {
    return res.status(400).json({ error: 'type must be email, whatsapp or whatsapp_group' });
  }
  if (type === 'whatsapp_group' && !/^[\w-]+@g\.us$/.test(String(value).trim())) {
    return res.status(400).json({ error: 'whatsapp_group value must be a group JID ending in @g.us' });
  }
  const result = await queryRun(
    'INSERT INTO recipients (job_id, type, value, label) VALUES (?, ?, ?, ?)',
    [req.params.jobId, type, value, label || null]
  );
  res.status(201).json(
    await queryGet('SELECT * FROM recipients WHERE recipient_id = ?', [result.insertId])
  );
});

router.delete('/:jobId/recipients/:rid', async (req, res) => {
  if (!await ownsJob(req.params.jobId, req.user.user_id)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const result = await queryRun(
    'DELETE FROM recipients WHERE recipient_id = ? AND job_id = ?',
    [req.params.rid, req.params.jobId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Recipient not found' });
  res.status(204).end();
});

module.exports = router;
