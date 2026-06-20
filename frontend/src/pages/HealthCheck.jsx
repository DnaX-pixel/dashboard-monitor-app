import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const STATUS_META = {
  ok:      { color: '#22c55e', icon: '✓', label: 'OK' },
  warning: { color: '#f59e0b', icon: '⚠', label: 'Warning' },
  error:   { color: '#ef4444', icon: '✕', label: 'Error' },
};

export default function HealthCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.get('/api/health')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);

  if (loading) return <div className="loading">Loading…</div>;
  if (!data)   return <div className="loading">Failed to load health data.</div>;

  const checks = Object.entries(data.checks);
  const overall = STATUS_META[data.overall] || STATUS_META.error;

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24, color: '#fff' }}>System Health</h1>

      {/* Overall status banner */}
      <div className="card" style={{ marginBottom: 20, borderColor: overall.color + '40' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: overall.color + '20', border: `2px solid ${overall.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: overall.color,
          }}>
            {overall.icon}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>System Status: {overall.label}</div>
            <div className="text-muted">{checks.length} components checked · auto-refresh every 15s</div>
          </div>
        </div>
      </div>

      {/* Individual checks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {checks.map(([key, check]) => {
          const meta = STATUS_META[check.status] || STATUS_META.error;
          return (
            <div key={key} className="card" style={{ marginBottom: 0, padding: '16px 20px', borderColor: meta.color + '25' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: meta.color + '15', border: `1.5px solid ${meta.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: meta.color, flexShrink: 0,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{check.label}</div>
                  {check.detail && (
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2, fontFamily: 'SF Mono, Fira Code, monospace' }}>
                      {check.detail}
                    </div>
                  )}
                </div>
                <span className={`badge badge-status-${check.status === 'ok' ? 'sent' : check.status === 'warning' ? 'pending' : 'failed'}`}>
                  {meta.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}