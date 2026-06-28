import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function CompareView() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({ a: null, b: null });

  useEffect(() => {
    Promise.all([
      api.get(`/api/jobs/${id}`),
      api.get(`/api/jobs/${id}/history`),
    ]).then(([j, h]) => {
      setJob(j);
      setHistory(h);
      const withShots = h.filter(x => x.screenshot_path);
      if (withShots.length >= 2) setSelected({ a: withShots[0].history_id, b: withShots[1].history_id });
      else if (withShots.length === 1) setSelected({ a: withShots[0].history_id, b: withShots[0].history_id });
    }).finally(() => setLoading(false));
  }, [id]);

  const runA = useMemo(() => history.find(h => h.history_id === selected.a), [history, selected.a]);
  const runB = useMemo(() => history.find(h => h.history_id === selected.b), [history, selected.b]);

  if (loading) return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;
  if (!job) return <div className="text-center py-20 text-text-dim">Job not found.</div>;

  const withShots = history.filter(h => h.screenshot_path);

  return (
    <div className="animate-fade-in-up">
      <Link to="/" className="inline-flex items-center gap-2 mb-4 text-text-muted hover:text-primary text-sm transition-colors">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Jobs
      </Link>
      <div className="mb-6">
        <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">compare_arrows</span> Compare: {job.job_name}
        </h2>
        <p className="font-[JetBrains_Mono] text-xs text-text-dim mt-1">{job.target_url}</p>
      </div>

      {/* Selectors */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-4">
        <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4">Select Runs to Compare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-[DM_Sans] text-sm font-bold text-text-primary block mb-2">Run A (newer)</label>
            <select value={selected.a || ''} onChange={e => setSelected(s => ({ ...s, a: +e.target.value }))} className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary focus:border-primary focus:outline-none">
              {withShots.map(h => <option key={h.history_id} value={h.history_id}>{h.run_at} {h.changed_flag ? '⚠ Changed' : '✓ Same'}</option>)}
            </select>
          </div>
          <div>
            <label className="font-[DM_Sans] text-sm font-bold text-text-primary block mb-2">Run B (older)</label>
            <select value={selected.b || ''} onChange={e => setSelected(s => ({ ...s, b: +e.target.value }))} className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary focus:border-primary focus:outline-none">
              {withShots.map(h => <option key={h.history_id} value={h.history_id}>{h.run_at} {h.changed_flag ? '⚠ Changed' : '✓ Same'}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-side */}
      {runA && runB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[runA, runB].map((run, i) => (
            <div key={i} className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-4 bg-surface-container-low border-b border-border-subtle">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${run.changed_flag ? 'bg-warning/10 text-warning' : 'bg-surface-container text-text-dim'}`}>{run.changed_flag ? 'Changed' : 'Same'}</span>
                <span className="font-[JetBrains_Mono] text-xs text-text-dim">{run.run_at}</span>
              </div>
              {run.screenshot_path ? <img src={`/static/${run.screenshot_path}`} alt={`Run ${i+1}`} className="w-full block" /> : <div className="h-48 flex items-center justify-center text-text-dim bg-surface-container-low">No screenshot</div>}
            </div>
          ))}
        </div>
      )}

      {/* OCR text */}
      {runA && runB && (runA.ocr_text || runB.ocr_text) && (
        <div className="bg-surface border border-border-subtle rounded-xl p-6">
          <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">difference</span> OCR Text Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-[DM_Sans] text-xs font-bold text-text-dim p-2.5 bg-surface-container-low rounded-lg mb-2">Run A — {runA.run_at}</div>
              <pre className="font-[JetBrains_Mono] text-xs text-text-muted bg-surface-container-low p-3.5 rounded-lg whitespace-pre-wrap break-words min-h-[100px] max-h-[400px] overflow-y-auto border border-border-subtle">{runA.ocr_text || '—'}</pre>
            </div>
            <div>
              <div className="font-[DM_Sans] text-xs font-bold text-text-dim p-2.5 bg-surface-container-low rounded-lg mb-2">Run B — {runB.run_at}</div>
              <pre className="font-[JetBrains_Mono] text-xs text-text-muted bg-surface-container-low p-3.5 rounded-lg whitespace-pre-wrap break-words min-h-[100px] max-h-[400px] overflow-y-auto border border-border-subtle">{runB.ocr_text || '—'}</pre>
            </div>
          </div>
        </div>
      )}

      {withShots.length < 2 && (
        <div className="bg-surface border border-border-subtle rounded-xl p-10 text-center">
          <p className="text-text-muted">Need at least 2 runs with screenshots to compare.</p>
        </div>
      )}
    </div>
  );
}