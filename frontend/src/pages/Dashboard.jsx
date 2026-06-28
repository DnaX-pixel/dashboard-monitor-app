import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function timeUntil(dateStr) {
  if (!dateStr) return '—';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'imminent';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const loadJobs = useCallback(async () => {
    try { setJobs(await api.get('/api/jobs')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

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
    if (!confirm(`Delete "${job.job_name}"?`)) return;
    try { await api.delete(`/api/jobs/${job.job_id}`); await loadJobs(); }
    catch (err) { alert(err.message); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;

  const activeCount = jobs.filter(j => j.status === 'active').length;
  const pausedCount = jobs.filter(j => j.status === 'paused').length;
  const failedCount = jobs.filter(j => j.last_run?.delivery_status === 'failed').length;

  const filtered = jobs.filter(j => {
    if (filter === 'active' && j.status !== 'active') return false;
    if (filter === 'paused' && j.status !== 'paused') return false;
    if (filter === 'failed' && j.last_run?.delivery_status !== 'failed') return false;
    if (search && !j.job_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-end mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div>
          <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary">Monitoring Jobs</h2>
          <p className="font-[DM_Sans] text-sm text-text-dim mt-1">Track website changes and get notified via Email & WhatsApp</p>
        </div>
        <Link to="/jobs/new" className="indigo-violet-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg">
          <span className="material-symbols-outlined text-xl">add</span>
          New Job
        </Link>
      </div>

      {/* Stats row */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Jobs" value={jobs.length} color="primary" shape="circle" delay="0.2s" />
          <StatCard label="Active" value={activeCount} color="success" shape="square" delay="0.3s" />
          <StatCard label="Paused" value={pausedCount} color="warning" shape="triangle" delay="0.4s" />
          <StatCard label="Failed" value={failedCount} color="danger" shape="xmark" delay="0.5s" />
        </div>
      )}

      {/* Toolbar */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center bg-surface-container rounded-lg p-1">
            {['all', 'active', 'paused', 'failed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-bold transition-all ${filter === f ? 'bg-surface-interactive text-primary rounded-md' : 'text-text-dim hover:text-text-primary'}`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-text-dim opacity-30 animate-float">monitor_heart</span>
          <p className="font-[DM_Sans] text-base text-text-muted mt-4 mb-6">No monitoring jobs yet.</p>
          <Link to="/jobs/new" className="indigo-violet-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm inline-flex items-center gap-2 hover:brightness-110 transition-all">
            <span className="material-symbols-outlined">add</span> Create your first job
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-text-dim opacity-30">search</span>
          <p className="font-[DM_Sans] text-base text-text-muted mt-4">No jobs match your search.</p>
        </div>
      ) : (
        /* Job grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((job, idx) => (
            <div
              key={job.job_id}
              className={`bg-surface border border-border-subtle rounded-xl p-6 flex flex-col group animate-fade-in-up shadow-sm hover:shadow-lg hover:border-border-bold transition-all hover:-translate-y-1 ${job.status === 'paused' ? 'opacity-60' : ''}`}
              style={{ animationDelay: `${0.7 + idx * 0.05}s` }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary">{job.job_name}</h4>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                  job.status === 'active'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-warning/10 text-warning border border-warning/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'active' ? 'bg-success glow-pulse' : 'bg-warning'}`} />
                  {job.status}
                </span>
              </div>

              {/* URL */}
              <p className="font-[JetBrains_Mono] text-xs text-primary truncate mb-4">{job.target_url || 'Multi-URL mode'}</p>

              {/* Schedule */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low border border-border-subtle rounded-lg w-fit mb-4">
                <span className="material-symbols-outlined text-sm text-text-muted">schedule</span>
                <span className="font-[JetBrains_Mono] text-[11px] text-text-muted">{job.schedule_cron}</span>
              </div>

              {/* Meta row */}
              <div className="flex gap-5 py-3 px-4 bg-surface-container-low rounded-lg border border-border-subtle mb-4">
                {job.last_run && (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-text-dim mb-1">Last Run</span>
                    <span className="text-xs font-[JetBrains_Mono] flex items-center gap-1" style={{ color: job.last_run.delivery_status === 'sent' ? '#10b981' : job.last_run.delivery_status === 'failed' ? '#f43f5e' : '#7b8095' }}>
                      {job.last_run.delivery_status}
                    </span>
                  </div>
                )}
                {job.status === 'active' && job.next_run && (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-text-dim mb-1">Next Run</span>
                    <span className="text-xs font-[JetBrains_Mono] text-primary font-semibold">{timeUntil(job.next_run)}</span>
                  </div>
                )}
              </div>

              {job.last_run?.error_message && (
                <div className="text-xs text-error flex items-center gap-1.5 mb-4 truncate">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  {job.last_run.error_message.slice(0, 60)}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border-subtle">
                <button onClick={() => runNow(job.job_id)} disabled={running[job.job_id] || job.status === 'paused'} className="p-2 hover:bg-surface-interactive rounded-lg text-text-dim hover:text-primary transition-all disabled:opacity-30" title="Run Now">
                  <span className="material-symbols-outlined">{running[job.job_id] ? 'progress_activity' : 'play_arrow'}</span>
                </button>
                <Link to={`/jobs/${job.job_id}/history`} className="p-2 hover:bg-surface-interactive rounded-lg text-text-dim hover:text-primary transition-all" title="History">
                  <span className="material-symbols-outlined">history</span>
                </Link>
                <Link to={`/jobs/${job.job_id}/compare`} className="p-2 hover:bg-surface-interactive rounded-lg text-text-dim hover:text-primary transition-all" title="Compare">
                  <span className="material-symbols-outlined">compare_arrows</span>
                </Link>
                <Link to={`/jobs/${job.job_id}/edit`} className="p-2 hover:bg-surface-interactive rounded-lg text-text-dim hover:text-primary transition-all" title="Edit">
                  <span className="material-symbols-outlined">edit</span>
                </Link>
                <button onClick={() => toggleStatus(job)} className="p-2 hover:bg-surface-interactive rounded-lg text-text-dim hover:text-primary transition-all" title={job.status === 'active' ? 'Pause' : 'Resume'}>
                  <span className="material-symbols-outlined">{job.status === 'active' ? 'pause' : 'play_arrow'}</span>
                </button>
                <button onClick={() => deleteJob(job)} className="p-2 hover:bg-surface-interactive rounded-lg text-text-dim hover:text-error transition-all ml-auto" title="Delete">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, shape, delay }) {
  const colors = { primary: '#c0c1ff', success: '#10b981', warning: '#f59e0b', danger: '#f43f5e' };
  const c = colors[color] || colors.primary;

  const shapes = {
    circle:  <circle cx="50" cy="50" fill="currentColor" r="40" />,
    square:  <rect fill="currentColor" height="60" width="60" x="20" y="20" />,
    triangle:<polygon fill="currentColor" points="50,10 90,90 10,90" />,
    xmark:   <><circle cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="10" /><line stroke="currentColor" strokeWidth="10" x1="20" x2="80" y1="20" y2="80" /></>,
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-6 relative overflow-hidden group animate-fade-in-up" style={{ animationDelay: delay }}>
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: c }}></div>
      <div className="relative z-10">
        <span className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-2">{label}</span>
        <h3 className="font-[Plus_Jakarta_Sans] text-[28px] font-extrabold text-text-primary">{value}</h3>
      </div>
      <svg className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:scale-110 transition-transform duration-500" height="120" viewBox="0 0 100 100" width="120" style={{ color: c }}>
        {shapes[shape]}
      </svg>
    </div>
  );
}