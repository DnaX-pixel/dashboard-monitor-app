const router = require('express').Router();
const { queryAll, queryGet, queryRun } = require('../db/database');
const requireAuth = require('../middleware/auth');
const { scheduleJob, unscheduleJob, getJobNextRuns } = require('../scheduler');
const { connectWhatsApp } = require('../services/whatsapp');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const jobs = await queryAll(
    'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.user_id]
  );

  const nextRuns = getJobNextRuns();
  for (const job of jobs) {
    const lastRun = await queryGet(
      'SELECT run_at, delivery_status, changed_flag, error_message FROM history WHERE job_id = ? ORDER BY run_at DESC LIMIT 1',
      [job.job_id]
    );
    job.next_run = nextRuns[job.job_id] || null;
    job.last_run = lastRun || null;
  }

  res.json(jobs);
});

router.post('/', async (req, res) => {
  const {
    job_name, target_url,
    crop_x, crop_y, crop_width, crop_height,
    schedule_cron, notify_only_on_change, notification_subject,
  } = req.body;

  if (!job_name || !schedule_cron) {
    return res.status(400).json({ error: 'job_name and schedule_cron are required' });
  }

  const result = await queryRun(`
    INSERT INTO jobs
      (user_id, job_name, target_url, crop_x, crop_y, crop_width, crop_height, schedule_cron, notify_only_on_change, notification_subject)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.user.user_id, job_name, target_url || '',
    crop_x ?? 0, crop_y ?? 0, crop_width ?? 100, crop_height ?? 100,
    schedule_cron,
    notify_only_on_change !== false ? 1 : 0,
    notification_subject ?? '',
  ]);

  const newJob = await queryGet('SELECT * FROM jobs WHERE job_id = ?', [result.insertId]);
  scheduleJob(newJob);
  // Include next_run in the response so the client can show countdown immediately
  newJob.next_run = getJobNextRuns()[newJob.job_id] || null;

  // Lazy connect WhatsApp for this user (if they have any whatsapp recipients)
  const hasWhatsAppRecipients = await queryGet(
    'SELECT 1 FROM recipients WHERE job_id = ? AND type = ? LIMIT 1',
    [newJob.job_id, 'whatsapp']
  );
  if (hasWhatsAppRecipients) {
    connectWhatsApp(req.user.user_id).catch(e =>
      console.error(`[WhatsApp ${req.user.user_id}] Lazy connect on job create failed:`, e.message)
    );
  }

  // Check SMTP is configured (if job has email recipients)
  const hasEmailRecipients = await queryGet(
    'SELECT 1 FROM recipients WHERE job_id = ? AND type = ? LIMIT 1',
    [newJob.job_id, 'email']
  );
  if (hasEmailRecipients) {
    const smtp = await queryGet(
      'SELECT 1 FROM user_smtp WHERE user_id = ? AND is_verified = 1',
      [req.user.user_id]
    );
    if (!smtp) {
      // Don't block job creation — but log warning
      console.warn(`[Job ${newJob.job_id}] User ${req.user.user_id} has email recipients but no verified SMTP`);
    }
  }

  res.status(201).json(newJob);
});

router.get('/:id', async (req, res) => {
  const job = await queryGet(
    'SELECT * FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.put('/:id', async (req, res) => {
  const job = await queryGet(
    'SELECT * FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const {
    job_name, target_url,
    crop_x, crop_y, crop_width, crop_height,
    schedule_cron, notify_only_on_change, status, notification_subject,
  } = req.body;

  await queryRun(`
    UPDATE jobs SET
      job_name = ?, target_url = ?,
      crop_x = ?, crop_y = ?, crop_width = ?, crop_height = ?,
      schedule_cron = ?, notify_only_on_change = ?, status = ?,
      notification_subject = ?
    WHERE job_id = ? AND user_id = ?
  `, [
    job_name              ?? job.job_name,
    target_url            ?? job.target_url,
    crop_x                ?? job.crop_x,
    crop_y                ?? job.crop_y,
    crop_width            ?? job.crop_width,
    crop_height           ?? job.crop_height,
    schedule_cron         ?? job.schedule_cron,
    notify_only_on_change !== undefined ? (notify_only_on_change ? 1 : 0) : job.notify_only_on_change,
    status                ?? job.status,
    notification_subject  !== undefined ? notification_subject : job.notification_subject,
    req.params.id, req.user.user_id,
  ]);

  const updated = await queryGet('SELECT * FROM jobs WHERE job_id = ?', [req.params.id]);
  scheduleJob(updated);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const job = await queryGet(
    'SELECT * FROM jobs WHERE job_id = ? AND user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  unscheduleJob(job.job_id);
  await queryRun('DELETE FROM jobs WHERE job_id = ?', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
