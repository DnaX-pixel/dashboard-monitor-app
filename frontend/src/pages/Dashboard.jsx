import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function timeUntil(dateStr) {
  if (!dateStr) return '—';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'imminent';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const LAST_RUN_META = {
  sent:    { color: '#22c55e', icon: '✓', label: 'Sent' },
  pending: { color: '#94a3b8', icon: '○', label: 'Skipped' },
  failed:  { color: '#ef4444', icon: '✕', label: 'Failed' },
};

export default function Dashboard() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [, setTick] = useState(0);

  const loadJobs = useCallback(async () => {
    try   { setJobs(await api.get('/api/jobs')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Tick every second for countdown
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function runNow(jobId) {
    setRunning(r => ({ ...r, [jobId]: true }));
    try {
      await api.post(`/api/jobs/${jobId}/run`);
      await loadJobs();
    } catch (err) {
      alert('Run failed: ' + err.message);
    } finally {
      setRunning(r => ({ ...r, [jobId]: false }));
    }
  }

  async function toggleStatus(job) {
    const status = job.status === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/api/jobs/${job.job_id}`, { status });
      await loadJobs();
    } catch (err) { alert(err.message); }
  }

  async function deleteJob(job) {
    if (!window.confirm(`Delete "${job.job_name}"? This will also delete all history.`)) return;
    try {
      await api.delete(`/api/jobs/${job.job_id}`);
      await loadJobs();
    } catch (err) { alert(err.message); }
  }

  if (loading) return <div className="loading">Loading…</div>;

  const activeCount = jobs.filter(j => j.status === 'active').length;
  const pausedCount = jobs.filter(j => j.status === 'paused').length;
  const failedCount = jobs.filter(j => j.last_run?.delivery_status === 'failed').length;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Monitoring Jobs</h1>
        <Link to="/jobs/new" className="btn btn-primary">+ New Job</Link>
      </div>

      {jobs.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{jobs.length}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#4ade80' }}>{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#fbbf24' }}>{pausedCount}</div>
            <div className="stat-label">Paused</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#fca5a5' }}>{failedCount}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No monitoring jobs yet.</p>
          <Link to="/jobs/new" className="btn btn-primary">Create your first job</Link>
        </div>
      ) : (
        <div className="job-grid">
          {jobs.map(job => {
            const lastMeta = job.last_run ? (LAST_RUN_META[job.last_run.delivery_status] || LAST_RUN_META.pending) : null;
            return (
              <div key={job.job_id} className={`card job-card ${job.status}`}>
                <div className="job-header">
                  <h2>{job.job_name}</h2>
                  <span className={`badge badge-${job.status}`}>{job.status}</span>
                </div>
                <p className="job-url" title={job.target_url}>{job.target_url}</p>
                <p className="job-schedule">⏱ {job.schedule_cron}</p>

                {/* Last run + Next run info */}
                <div className="job-meta-row">
                  {job.last_run && (
                    <div className="job-meta-item">
                      <span className="job-meta-label">Last run</span>
                      <span className="job-meta-value" style={{ color: lastMeta.color }}>
                        {lastMeta.icon} {job.last_run.run_at}
                      </span>
                    </div>
                  )}
                  {job.status === 'active' && job.next_run && (
                    <div className="job-meta-item">
                      <span className="job-meta-label">Next run</span>
                      <span className="job-meta-value countdown">{timeUntil(job.next_run)}</span>
                    </div>
                  )}
                </div>

                {job.last_run?.error_message && (
                  <div className="job-error" title={job.last_run.error_message}>
                    ⚠ {job.last_run.error_message.slice(0, 60)}
                  </div>
                )}

                <div className="job-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={running[job.job_id] || job.status === 'paused'}
                    onClick={() => runNow(job.job_id)}
                  >
                    {running[job.job_id] ? 'Running…' : '▶ Run Now'}
                  </button>
                  <Link to={`/jobs/${job.job_id}/history`} className="btn btn-sm">History</Link>
                  <Link to={`/jobs/${job.job_id}/compare`} className="btn btn-sm">Compare</Link>
                  <Link to={`/jobs/${job.job_id}/edit`}    className="btn btn-sm">Edit</Link>
                  <button className={`btn btn-sm ${job.status === 'paused' ? 'btn-success' : ''}`} onClick={() => toggleStatus(job)}>
                    {job.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteJob(job)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}