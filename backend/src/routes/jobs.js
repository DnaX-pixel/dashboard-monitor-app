const router = require('express').Router();
const db = require('../db/database');
const requireAuth = require('../middleware/auth');
const { scheduleJob, unscheduleJob, getJobNextRuns } = require('../scheduler');

router.use(requireAuth);

router.get('/', (req, res) => {
  const jobs = db.prepare(
    'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC'
  ).all([req.user.user_id]);

  // Attach next run + last run info
  const nextRuns = getJobNextRuns();
  for (const job of jobs) {
    const lastRun = db.prepare(
      'SELECT run_at, delivery_status, changed_flag, error_message FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 1'
    ).get([job.job_id]);
    job.next_run = nextRuns[job.job_id] || null;
    job.last_run = lastRun || null;
  }

  res.json(jobs);
});

router.post('/', (req, res) => {
  const {
    job_name, target_url,
    crop_x, crop_y, crop_width, crop_height,
    schedule_cron, notify_only_on_change, notification_subject,
  } = req.body;

  if (!job_name || !schedule_cron) {
    return res.status(400).json({ error: 'job_name and schedule_cron are required' });
  }

  const result = db.prepare(`
    INSERT INTO jobs
      (user_id, job_name, target_url, crop_x, crop_y, crop_width, crop_height, schedule_cron, notify_only_on_change, notification_subject)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run([
    req.user.user_id, job_name, target_url,
    crop_x ?? 0, crop_y ?? 0, crop_width ?? 100, crop_height ?? 100,
    schedule_cron,
    notify_only_on_change !== false ? 1 : 0,
    notification_subject ?? '',
  ]);

  const newJob = db.prepare('SELECT * FROM jobs WHERE job_id = ?').get([result.lastInsertRowid]);
  scheduleJob(newJob);
  res.status(201).json(newJob);
});

router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE job_id = ? AND user_id = ?').get([req.params.id, req.user.user_id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.put('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE job_id = ? AND user_id = ?').get([req.params.id, req.user.user_id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const {
    job_name, target_url,
    crop_x, crop_y, crop_width, crop_height,
    schedule_cron, notify_only_on_change, status, notification_subject,
  } = req.body;

  db.prepare(`
    UPDATE jobs SET
      job_name = ?, target_url = ?,
      crop_x = ?, crop_y = ?, crop_width = ?, crop_height = ?,
      schedule_cron = ?, notify_only_on_change = ?, status = ?,
      notification_subject = ?
    WHERE job_id = ? AND user_id = ?
  `).run([
    job_name              ?? job.job_name,
    target_url            ?? job.target_url,
    crop_x                ?? job.crop_x,
    crop_y                ?? job.crop_y,
    crop_width            ?? job.crop_width,
    crop_height           ?? job.crop_height,
    schedule_cron         ?? job.schedule_cron,
    notify_only_on_change !== undefined ? (notify_only_on_change ? 1 : 0) : job.notify_only_on_change,
    status ?? job.status,
    notification_subject !== undefined ? notification_subject : job.notification_subject,
    req.params.id, req.user.user_id,
  ]);

  const updated = db.prepare('SELECT * FROM jobs WHERE job_id = ?').get([req.params.id]);
  scheduleJob(updated); // handles activate, pause, and reschedule in one call
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE job_id = ? AND user_id = ?').get([req.params.id, req.user.user_id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  unscheduleJob(job.job_id);
  db.prepare('DELETE FROM jobs WHERE job_id = ?').run([req.params.id]);
  res.status(204).end();
});

module.exports = router;
