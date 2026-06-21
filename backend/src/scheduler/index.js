const cron = require('node-cron');
const { CronExpressionParser } = require('cron-parser');
const { queryAll } = require('../db/database');
const { runJob }   = require('../services/runner');

// jobId (number) → { task, cron }
const tasks = new Map();

function scheduleJob(job) {
  if (tasks.has(job.job_id)) {
    tasks.get(job.job_id).task.stop();
    tasks.delete(job.job_id);
  }

  if (job.status !== 'active') return;

  if (!cron.validate(job.schedule_cron)) {
    console.warn(`[Scheduler] Invalid cron "${job.schedule_cron}" for job ${job.job_id} — skipping`);
    return;
  }

  const task = cron.schedule(job.schedule_cron, async () => {
    console.log(`[Scheduler] Firing job ${job.job_id} (${job.job_name})`);
    try {
      const h = await runJob(job.job_id);
      if (h) console.log(`[Scheduler] Job ${job.job_id} done: changed=${h.changed_flag} status=${h.delivery_status}`);
    } catch (err) {
      console.error(`[Scheduler] Job ${job.job_id} error:`, err.message);
    }
  });

  tasks.set(job.job_id, { task, cron: job.schedule_cron });
  console.log(`[Scheduler] Scheduled job ${job.job_id} (${job.job_name}) @ "${job.schedule_cron}"`);
}

function unscheduleJob(jobId) {
  if (tasks.has(jobId)) {
    tasks.get(jobId).task.stop();
    tasks.delete(jobId);
    console.log(`[Scheduler] Unscheduled job ${jobId}`);
  }
}

function getScheduledJobIds() {
  return [...tasks.keys()];
}

function getNextRun(cronExpr) {
  try {
    const interval = CronExpressionParser.parse(cronExpr, { tz: 'Asia/Kuala_Lumpur' });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

function getJobNextRuns() {
  const result = {};
  for (const [jobId, { cron: cronExpr }] of tasks) {
    result[jobId] = getNextRun(cronExpr);
  }
  return result;
}

async function initScheduler() {
  const jobs = await queryAll("SELECT * FROM jobs WHERE status = 'active'");
  for (const job of jobs) scheduleJob(job);
  console.log(`[Scheduler] Initialised — ${tasks.size} job(s) scheduled`);
}

module.exports = { initScheduler, scheduleJob, unscheduleJob, getScheduledJobIds, getJobNextRuns, getNextRun };
