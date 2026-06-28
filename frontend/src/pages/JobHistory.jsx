import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function JobHistory() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/jobs/${id}`),
      api.get(`/api/jobs/${id}/history`),
    ]).then(([j, h]) => { setJob(j); setHistory(h); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;
  if (!job) return <div className="text-center py-20 text-text-dim">Job not found.</div>;

  const changedCount = history.filter(h => h.changed_flag).length;
  const sentCount = history.filter(h => h.delivery_status === 'sent').length;

  return (
    <div className="animate-fade-in-up">
      <Link to="/" className="inline-flex items-center gap-2 mb-4 text-text-muted hover:text-primary text-sm transition-colors">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Jobs
      </Link>
      <div className="mb-6">
        <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary">History: {job.job_name}</h2>
        <p className="font-[JetBrains_Mono] text-xs text-text-dim mt-1">{job.target_url}</p>
      </div>

      {/* Stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Runs" value={history.length} color="#c0c1ff" icon="history" />
          <StatCard label="Changes Detected" value={changedCount} color="#f59e0b" icon="trending_up" />
          <StatCard label="Notifications Sent" value={sentCount} color="#10b981" icon="done_all" />
        </div>
      )}

      {/* Table */}
      {history.length === 0 ? (
        <div className="text-center py-20 text-text-muted">No runs yet. Click "Run" on the dashboard to start.</div>
      ) : (
        <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low">
                {['Screenshot', 'Checked At', 'Changed', 'Delivery', 'OCR Text', 'Error'].map(h => (
                  <th key={h} className="text-left font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim px-4 py-3 border-b border-border-subtle">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.history_id} className="border-b border-border-subtle hover:bg-surface-interactive transition-colors">
                  <td className="px-4 py-3">
                    {h.screenshot_path ? (
                      <a href={`/static/${h.screenshot_path}`} target="_blank" rel="noreferrer">
                        <img src={`/static/${h.screenshot_path}`} alt="screenshot" className="w-24 h-14 object-cover rounded-lg border border-border-subtle hover:scale-105 hover:border-primary transition-all" />
                      </a>
                    ) : <span className="text-text-dim">—</span>}
                  </td>
                  <td className="px-4 py-3 font-[JetBrains_Mono] text-xs whitespace-nowrap">{h.run_at}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${h.changed_flag ? 'bg-warning/10 text-warning' : 'bg-surface-container text-text-dim'}`}>{h.changed_flag ? 'Changed' : 'Same'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      h.delivery_status === 'sent' ? 'bg-success/10 text-success' :
                      h.delivery_status === 'failed' ? 'bg-error/10 text-error' :
                      'bg-surface-container text-text-dim'
                    }`}>{h.delivery_status}</span>
                  </td>
                  <td className="px-4 py-3"><span className="font-[JetBrains_Mono] text-xs text-text-dim block max-w-[220px] truncate">{(h.ocr_text || '—').slice(0, 80)}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-error max-w-[200px] truncate block">{h.error_message || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color }}></div>
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
          <span className="material-symbols-outlined" style={{ color }}>{icon}</span>
        </div>
        <div>
          <h3 className="font-[Plus_Jakarta_Sans] text-[28px] font-extrabold text-text-primary leading-none">{value}</h3>
          <span className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim">{label}</span>
        </div>
      </div>
    </div>
  );
}