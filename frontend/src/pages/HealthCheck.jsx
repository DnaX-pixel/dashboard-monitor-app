import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const STATUS_META = {
  ok:      { color: '#10b981', icon: 'check_circle', label: 'OK' },
  warning: { color: '#f59e0b', icon: 'warning',       label: 'Warning' },
  error:   { color: '#f43f5e', icon: 'error',        label: 'Error' },
};

export default function HealthCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.get('/api/health')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;
  if (!data) return <div className="text-center py-20 text-text-dim">Failed to load health data.</div>;

  const checks = Object.entries(data.checks);
  const overall = STATUS_META[data.overall] || STATUS_META.error;

  return (
    <div className="animate-fade-in-up max-w-3xl mx-auto">
      <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-6">System Health</h2>

      {/* Overall banner */}
      <div className="bg-surface border rounded-xl p-6 mb-4" style={{ borderColor: overall.color + '40' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: overall.color + '20', border: `2px solid ${overall.color}` }}>
            <span className="material-symbols-outlined text-2xl" style={{ color: overall.color }}>{overall.icon}</span>
          </div>
          <div>
            <div className="font-[Plus_Jakarta_Sans] text-xl font-bold text-text-primary">System Status: {overall.label}</div>
            <div className="text-text-muted text-sm">{checks.length} components checked · auto-refresh every 15s</div>
          </div>
        </div>
      </div>

      {/* Component cards */}
      <div className="space-y-3">
        {checks.map(([key, check]) => {
          const meta = STATUS_META[check.status] || STATUS_META.error;
          return (
            <div key={key} className="bg-surface border rounded-xl p-4 relative overflow-hidden" style={{ borderColor: meta.color + '25' }}>
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: meta.color }} />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: meta.color + '15', border: `1.5px solid ${meta.color}` }}>
                  <span className="material-symbols-outlined text-base" style={{ color: meta.color }}>{meta.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-text-primary">{check.label}</div>
                  {check.detail && <div className="text-xs text-text-muted font-[JetBrains_Mono] mt-0.5">{check.detail}</div>}
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: meta.color + '10', color: meta.color }}>{meta.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}