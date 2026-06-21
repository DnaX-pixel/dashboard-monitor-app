import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

export default function JobHistory() {
  const { id } = useParams();
  const [job,     setJob]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/jobs/${id}`),
      api.get(`/api/jobs/${id}/history`),
    ]).then(([j, h]) => {
      setJob(j);
      setHistory(h);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading…</div>;
  if (!job)    return <div className="loading">Job not found.</div>;

  const changedCount = history.filter(h => h.changed_flag).length;
  const sentCount = history.filter(h => h.delivery_status === 'sent').length;

  return (
    <div className="animate-in">
      <Link to="/" className="back-link"><Icon name="arrowLeft" size={14} /> Back to Jobs</Link>
      <div className="page-header">
        <div>
          <h1>History: {job.job_name}</h1>
          <p className="text-muted" style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12 }}>{job.target_url}</p>
        </div>
      </div>

      {history.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(99,102,241,.1)', color: '#818cf8' }}><Icon name="history" size={20} /></div>
            <div className="stat-value">{history.length}</div>
            <div className="stat-label">Total Runs</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,.1)', color: '#fbbf24' }}><Icon name="alert" size={20} /></div>
            <div className="stat-value" style={{ color: '#fbbf24' }}>{changedCount}</div>
            <div className="stat-label">Changes Detected</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ background: 'rgba(16,185,129,.1)', color: '#34d399' }}><Icon name="mail" size={20} /></div>
            <div className="stat-value" style={{ color: '#34d399' }}>{sentCount}</div>
            <div className="stat-label">Notifications Sent</div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-muted" style={{ padding: 40, textAlign: 'center' }}>
          No runs yet. Click "Run Now" on the dashboard to start.
        </p>
      ) : (
        <div className="history-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Screenshot</th>
                <th>Checked At</th>
                <th>Changed</th>
                <th>Delivery</th>
                <th>OCR Text</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.history_id}>
                  <td>
                    {h.screenshot_path
                      ? <a href={`/static/${h.screenshot_path}`} target="_blank" rel="noreferrer">
                          <img
                            src={`/static/${h.screenshot_path}`}
                            alt="screenshot"
                            className="thumb"
                          />
                        </a>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12 }}>{h.run_at}</td>
                  <td>
                    <span className={`badge badge-${h.changed_flag ? 'changed' : 'same'}`}>
                      {h.changed_flag ? 'Changed' : 'Same'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-status-${h.delivery_status}`}>
                      {h.delivery_status}
                    </span>
                  </td>
                  <td>
                    <span className="ocr-preview" title={h.ocr_text || ''}>
                      {(h.ocr_text || '—').slice(0, 80)}
                    </span>
                  </td>
                  <td>
                    {h.error_message
                      ? <span className="error-cell" title={h.error_message}>{h.error_message}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}