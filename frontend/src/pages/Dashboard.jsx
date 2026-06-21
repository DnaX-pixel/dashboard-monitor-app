import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

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
  sent:    { color: '#10b981', icon: 'check', label: 'Sent' },
  pending: { color: '#7b8095', icon: 'circle', label: 'Skipped' },
  failed:  { color: '#f43f5e', icon: 'x', label: 'Failed' },
};

function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(start + (target - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* Premium stat card with decorative SVG blobs (adapted from 21st.dev Magic) */
function StatCard({ value, label, icon, bg, accent }) {
  const animated = useCountUp(value);
  return (
    <div className="stat-card premium-stat" style={{ '--stat-bg': bg, '--stat-accent': accent }}>
      <svg className="stat-decor" viewBox="0 0 200 120" fill="none" preserveAspectRatio="none">
        <circle cx="160" cy="40" r="60" fill={accent} fillOpacity="0.08" />
        <circle cx="180" cy="80" r="35" fill={accent} fillOpacity="0.06" />
        <circle cx="140" cy="100" r="25" fill={accent} fillOpacity="0.05" />
      </svg>
      <div className="stat-content">
        <div className="stat-icon-wrap" style={{ background: `${accent}15`, color: accent }}>
          <Icon name={icon} size={20} />
        </div>
        <div className="stat-value">{animated}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const loadJobs = useCallback(async () => {
    try { setJobs(await api.get('/api/jobs')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function runNow(jobId) {
    setRunning(r => ({ ...r, [jobId]: true }));
    try { await api.post(`/api/jobs/${jobId}/run`); await loadJobs(); }
    catch (err) { alert('Run failed: ' + err.message); }
    finally { setRunning(r => ({ ...r, [jobId]: false })); }
  }

  async function toggleStatus(job) {
    const status = job.status === 'active' ? 'paused' : 'active';
    try { await api.put(`/api/jobs/${job.job_id}`, { status }); await loadJobs(); }
    catch (err) { alert(err.message); }
  }

  async function deleteJob(job) {
    if (!window.confirm(`Delete "${job.job_name}"? This will also delete all history.`)) return;
    try { await api.delete(`/api/jobs/${job.job_id}`); await loadJobs(); }
    catch (err) { alert(err.message); }
  }

  if (loading) return <div className="loading">Loading…</div>;

  const activeCount = jobs.filter(j => j.status === 'active').length;
  const pausedCount = jobs.filter(j => j.status === 'paused').length;
  const failedCount = jobs.filter(j => j.last_run?.delivery_status === 'failed').length;

  const filtered = jobs.filter(j => {
    if (filter === 'active' && j.status !== 'active') return false;
    if (filter === 'paused' && j.status !== 'paused') return false;
    if (filter === 'failed' && j.last_run?.delivery_status !== 'failed') return false;
    if (search && !j.job_name.toLowerCase().includes(search.toLowerCase()) && !j.target_url.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Monitoring Jobs</h1>
          <div className="page-sub">Track website changes and get notified via Email &amp; WhatsApp</div>
        </div>
        <Link to="/jobs/new" className="btn btn-primary"><Icon name="plus" size={16} /> New Job</Link>
      </div>

      {jobs.length > 0 && (
        <div className="stats-row">
          <StatCard value={jobs.length} label="Total Jobs" icon="jobs" accent="#818cf8" />
          <StatCard value={activeCount} label="Active" icon="play" accent="#34d399" />
          <StatCard value={pausedCount} label="Paused" icon="pause" accent="#fbbf24" />
          <StatCard value={failedCount} label="Failed" icon="alert" accent="#fb7185" />
        </div>
      )}

      {jobs.length > 0 && (
        <div className="toolbar">
          <div className="toolbar-search">
            <span className="search-icon"><Icon name="search" size={16} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or URL..." />
          </div>
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Active</button>
            <button className={`filter-tab ${filter === 'paused' ? 'active' : ''}`} onClick={() => setFilter('paused')}>Paused</button>
            <button className={`filter-tab ${filter === 'failed' ? 'active' : ''}`} onClick={() => setFilter('failed')}>Failed</button>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="clipboard" size={48} /></span>
          <p>No monitoring jobs yet.</p>
          <Link to="/jobs/new" className="btn btn-primary"><Icon name="plus" size={16} /> Create your first job</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="search" size={40} /></span>
          <p>No jobs match your search.</p>
        </div>
      ) : (
        <div className="job-grid">
          {filtered.map((job, idx) => {
            const lastMeta = job.last_run ? (LAST_RUN_META[job.last_run.delivery_status] || LAST_RUN_META.pending) : null;
            return (
              <div key={job.job_id} className={`card job-card ${job.status}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="job-header">
                  <h2>{job.job_name}</h2>
                  <span className={`badge badge-${job.status}`}>{job.status}</span>
                </div>
                <p className="job-url" title={job.target_url}>{job.target_url}</p>
                <p className="job-schedule"><Icon name="schedule" size={12} /> {job.schedule_cron}</p>

                <div className="job-meta-row">
                  {job.last_run && (
                    <div className="job-meta-item">
                      <span className="job-meta-label">Last run</span>
                      <span className="job-meta-value" style={{ color: lastMeta.color }}>
                        <Icon name={lastMeta.icon} size={12} /> {job.last_run.run_at}
                      </span>
                    </div>
                  )}
                  {job.status === 'active' && job.next_run && (
                    <div className="job-meta-item">
                      <span className="job-meta-label">Next run</span>
                      <span className="job-meta-value countdown"><Icon name="clock" size={12} /> {timeUntil(job.next_run)}</span>
                    </div>
                  )}
                </div>

                {job.last_run?.error_message && (
                  <div className="job-error" title={job.last_run.error_message}>
                    <Icon name="alert" size={13} /> {job.last_run.error_message.slice(0, 60)}
                  </div>
                )}

                <div className="job-actions">
                  <button className="btn btn-sm btn-primary" disabled={running[job.job_id] || job.status === 'paused'} onClick={() => runNow(job.job_id)}>
                    {running[job.job_id] ? 'Running…' : <><Icon name="play" size={13} /> Run</>}
                  </button>
                  <Link to={`/jobs/${job.job_id}/history`} className="btn btn-sm"><Icon name="history" size={14} /> History</Link>
                  <Link to={`/jobs/${job.job_id}/compare`} className="btn btn-sm"><Icon name="compare" size={14} /> Compare</Link>
                  <Link to={`/jobs/${job.job_id}/edit`} className="btn btn-sm"><Icon name="edit" size={14} /> Edit</Link>
                  <button className={`btn btn-sm ${job.status === 'paused' ? 'btn-success' : ''}`} onClick={() => toggleStatus(job)}>
                    {job.status === 'active' ? <><Icon name="pause" size={13} /> Pause</> : <><Icon name="play" size={13} /> Resume</>}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteJob(job)}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}