const router = require('express').Router();
const { queryAll, queryGet, queryRun } = require('../db/database');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

async function verifyJobOwnership(req, res, next) {
  const { jobId } = req.params;
  const job = await queryGet(
    'SELECT * FROM jobs WHERE job_id = ? AND user_id = ?',
    [jobId, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  next();
}

// GET /api/jobs/:jobId/items
router.get('/:jobId/items', verifyJobOwnership, async (req, res) => {
  const items = await queryAll(
    'SELECT * FROM job_items WHERE job_id = ? ORDER BY sort_order, item_id',
    [req.params.jobId]
  );
  res.json(items);
});

// POST /api/jobs/:jobId/items
router.post('/:jobId/items', verifyJobOwnership, async (req, res) => {
  const { label, target_url, crop_x, crop_y, crop_width, crop_height, sort_order } = req.body;
  if (!target_url) return res.status(400).json({ error: 'target_url required' });

  const result = await queryRun(`
    INSERT INTO job_items (job_id, label, target_url, crop_x, crop_y, crop_width, crop_height, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.params.jobId,
    label || '',
    target_url,
    crop_x ?? 0, crop_y ?? 0, crop_width ?? 100, crop_height ?? 100,
    sort_order ?? 0,
  ]);

  res.status(201).json(
    await queryGet('SELECT * FROM job_items WHERE item_id = ?', [result.insertId])
  );
});

// PUT /api/jobs/:jobId/items/:itemId
router.put('/:jobId/items/:itemId', verifyJobOwnership, async (req, res) => {
  const { label, target_url, crop_x, crop_y, crop_width, crop_height, sort_order } = req.body;
  const item = await queryGet(
    'SELECT * FROM job_items WHERE item_id = ? AND job_id = ?',
    [req.params.itemId, req.params.jobId]
  );
  if (!item) return res.status(404).json({ error: 'Item not found' });

  await queryRun(`
    UPDATE job_items SET
      label = ?, target_url = ?,
      crop_x = ?, crop_y = ?, crop_width = ?, crop_height = ?,
      sort_order = ?
    WHERE item_id = ?
  `, [
    label       ?? item.label,
    target_url  ?? item.target_url,
    crop_x      ?? item.crop_x,
    crop_y      ?? item.crop_y,
    crop_width  ?? item.crop_width,
    crop_height ?? item.crop_height,
    sort_order  ?? item.sort_order,
    req.params.itemId,
  ]);

  res.json(await queryGet('SELECT * FROM job_items WHERE item_id = ?', [req.params.itemId]));
});

// DELETE /api/jobs/:jobId/items/:itemId
router.delete('/:jobId/items/:itemId', verifyJobOwnership, async (req, res) => {
  await queryRun(
    'DELETE FROM job_items WHERE item_id = ? AND job_id = ?',
    [req.params.itemId, req.params.jobId]
  );
  res.status(204).end();
});

module.exports = router;
