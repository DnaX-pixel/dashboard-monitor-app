import { useState, useEffect } from 'react';
import { api } from '../api';

const PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587 },
  { label: 'Outlook', host: 'smtp-mail.outlook.com', port: 587 },
  { label: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587 },
  { label: 'Hostinger', host: 'smtp.hostinger.com', port: 465 },
  { label: 'Zoho', host: 'smtp.zoho.com', port: 587 },
  { label: 'Custom', host: '', port: 587 },
];

export default function EmailSettings() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '', use_tls: true });
  const [preset, setPreset] = useState('Custom');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/email').then(s => {
      if (s.configured) {
        setConfig(s);
        setForm({ smtp_host: s.smtp_host, smtp_port: s.smtp_port, smtp_user: s.smtp_user, smtp_pass: '', smtp_from: s.smtp_from, use_tls: Boolean(s.use_tls) });
        const match = PRESETS.find(p => p.host === s.smtp_host);
        if (match) setPreset(match.label);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function applyPreset(label) {
    setPreset(label);
    const p = PRESETS.find(x => x.label === label);
    if (p && p.host) setForm(f => ({ ...f, smtp_host: p.host, smtp_port: p.port, use_tls: p.port !== 465 }));
  }

  async function save() {
    setError(''); setSuccess('');
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass || !form.smtp_from) { setError('All fields are required'); return; }
    setSaving(true);
    try {
      await api.put('/api/email', form);
      setSuccess('Saved. Now verify the connection.');
      const s = await api.get('/api/email');
      setConfig(s);
      setForm(f => ({ ...f, smtp_pass: '' }));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function verify() {
    setError(''); setSuccess('');
    setVerifying(true);
    try {
      await api.post('/api/email/verify');
      setSuccess('SMTP connection verified successfully');
      setConfig(await api.get('/api/email'));
    } catch (e) { setError(e.message); }
    finally { setVerifying(false); }
  }

  async function remove() {
    if (!confirm('Delete SMTP configuration?')) return;
    setError(''); setSuccess('');
    try {
      await api.delete('/api/email');
      setConfig(null);
      setForm({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '', use_tls: true });
      setSuccess('SMTP configuration removed');
    } catch (e) { setError(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto">
      <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-2">Email Settings</h2>
      <p className="font-[DM_Sans] text-sm text-text-dim mb-6">Configure your own SMTP server. Notifications will be sent from your email account.</p>

      {/* Status banner */}
      {config?.configured && (
        <div className="bg-surface border border-border-subtle rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${config.is_verified ? 'bg-success glow-pulse' : 'bg-warning'}`} />
          <div className="flex-1">
            <div className="font-bold text-text-primary text-sm">{config.smtp_user}</div>
            <div className="text-xs text-text-dim font-[JetBrains_Mono]">{config.smtp_host}:{config.smtp_port} — {config.is_verified ? <span className="text-success">Verified</span> : <span className="text-warning">Not verified</span>}</div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 space-y-[18px]">
        <div>
          <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Provider</label>
          <select value={preset} onChange={e => applyPreset(e.target.value)} className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary focus:border-primary focus:outline-none">
            {PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">SMTP Host</label>
          <input value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.gmail.com" className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Port</label>
            <input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value, 10) || 587 })} className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
              <input type="checkbox" checked={form.use_tls} onChange={e => setForm({ ...form, use_tls: e.target.checked })} className="w-4 h-4 accent-[#6366f1]" /> Use TLS
            </label>
          </div>
        </div>
        <div>
          <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Username</label>
          <input value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })} placeholder="your@email.com" className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">Password {config?.configured && <span className="normal-case font-normal text-text-dim">(leave blank to keep)</span>}</label>
          <input type="password" value={form.smtp_pass} onChange={e => setForm({ ...form, smtp_pass: e.target.value })} placeholder={config?.configured ? '••••••••' : 'your-password'} className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block mb-1.5">From Address</label>
          <input value={form.smtp_from} onChange={e => setForm({ ...form, smtp_from: e.target.value })} placeholder="alerts@yourdomain.com" className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {error && <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2"><span className="material-symbols-outlined">error</span>{error}</div>}
        {success && <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

        <div className="flex gap-2 flex-wrap pt-2">
          <button onClick={save} disabled={saving} className="indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2">
            {saving ? <><span className="material-symbols-outlined animate-spin-slow">progress_activity</span> Saving…</> : <><span className="material-symbols-outlined">check</span> Save</>}
          </button>
          {config?.configured && (
            <>
              <button onClick={verify} disabled={verifying} className="px-5 py-2.5 bg-surface-container-high border border-border-subtle rounded-lg font-bold text-sm text-text-primary hover:bg-surface-interactive disabled:opacity-50 transition-all flex items-center gap-2">
                {verifying ? <><span className="material-symbols-outlined animate-spin-slow">progress_activity</span> Verifying…</> : <><span className="material-symbols-outlined">sync</span> Verify</>}
              </button>
              <button onClick={remove} className="px-5 py-2.5 bg-error/10 text-error border border-error/20 rounded-lg font-bold text-sm hover:bg-error hover:text-white transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">delete</span> Remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}