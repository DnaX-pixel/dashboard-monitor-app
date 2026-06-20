import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function CompareView() {
  const { id } = useParams();
  const [job,     setJob]     = useState(null);
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
      // Default: last two runs where screenshots exist
      const withShots = h.filter(x => x.screenshot_path);
      if (withShots.length >= 2) {
        setSelected({ a: withShots[0].history_id, b: withShots[1].history_id });
      } else if (withShots.length === 1) {
        setSelected({ a: withShots[0].history_id, b: withShots[0].history_id });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const runA = useMemo(() => history.find(h => h.history_id === selected.a), [history, selected.a]);
  const runB = useMemo(() => history.find(h => h.history_id === selected.b), [history, selected.b]);

  if (loading) return <div className="loading">Loading…</div>;
  if (!job)    return <div className="loading">Job not found.</div>;

  const withShots = history.filter(h => h.screenshot_path);

  return (
    <div className="animate-in">
      <Link to="/" className="back-link">← Back to Jobs</Link>
      <div className="page-header">
        <div>
          <h1>Compare: {job.job_name}</h1>
          <p className="text-muted" style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12 }}>{job.target_url}</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="card">
        <h2>Select Runs to Compare</h2>
        <div className="compare-selectors">
          <div className="compare-selector-item">
            <label>Run A (newer)</label>
            <select value={selected.a || ''} onChange={e => setSelected(s => ({ ...s, a: +e.target.value }))}>
              {withShots.map(h => (
                <option key={h.history_id} value={h.history_id}>
                  {h.run_at} {h.changed_flag ? '⚠ Changed' : '○ Same'}
                </option>
              ))}
            </select>
          </div>
          <div className="compare-selector-item">
            <label>Run B (older)</label>
            <select value={selected.b || ''} onChange={e => setSelected(s => ({ ...s, b: +e.target.value }))}>
              {withShots.map(h => (
                <option key={h.history_id} value={h.history_id}>
                  {h.run_at} {h.changed_flag ? '⚠ Changed' : '○ Same'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-side screenshots */}
      {runA && runB && (
        <div className="compare-grid">
          <div className="card compare-card">
            <div className="compare-header">
              <span className={`badge badge-${runA.changed_flag ? 'changed' : 'same'}`}>
                {runA.changed_flag ? 'Changed' : 'Same'}
              </span>
              <span className="compare-date">{runA.run_at}</span>
            </div>
            {runA.screenshot_path ? (
              <img src={`/static/${runA.screenshot_path}`} alt="Run A" className="compare-img" />
            ) : <div className="compare-no-img">No screenshot</div>}
          </div>

          <div className="card compare-card">
            <div className="compare-header">
              <span className={`badge badge-${runB.changed_flag ? 'changed' : 'same'}`}>
                {runB.changed_flag ? 'Changed' : 'Same'}
              </span>
              <span className="compare-date">{runB.run_at}</span>
            </div>
            {runB.screenshot_path ? (
              <img src={`/static/${runB.screenshot_path}`} alt="Run B" className="compare-img" />
            ) : <div className="compare-no-img">No screenshot</div>}
          </div>
        </div>
      )}

      {/* OCR text diff */}
      {runA && runB && (runA.ocr_text || runB.ocr_text) && (
        <div className="card">
          <h2>OCR Text Comparison</h2>
          <div className="ocr-diff-grid">
            <div className="ocr-diff-col">
              <div className="ocr-diff-label">Run A — {runA.run_at}</div>
              <pre className="ocr-diff-text">{runA.ocr_text || '—'}</pre>
            </div>
            <div className="ocr-diff-col">
              <div className="ocr-diff-label">Run B — {runB.run_at}</div>
              <pre className="ocr-diff-text">{runB.ocr_text || '—'}</pre>
            </div>
          </div>
        </div>
      )}

      {withShots.length < 2 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">Need at least 2 runs with screenshots to compare. Run the job more times.</p>
        </div>
      )}
    </div>
  );
}