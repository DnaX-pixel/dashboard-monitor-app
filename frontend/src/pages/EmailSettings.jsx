import { useState, useEffect } from 'react';
import { api } from '../api';
import Icon from '../components/Icon';

const PRESETS = [
  { label: 'Gmail',       host: 'smtp.gmail.com',       port: 587 },
  { label: 'Outlook',     host: 'smtp-mail.outlook.com', port: 587 },
  { label: 'Yahoo',       host: 'smtp.mail.yahoo.com',  port: 587 },
  { label: 'Hostinger',   host: 'smtp.hostinger.com',   port: 465 },
  { label: 'Zoho',        host: 'smtp.zoho.com',        port: 587 },
  { label: 'Custom',      host: '',                     port: 587 },
];

export default function EmailSettings() {
  const [config,    setConfig]    = useState(null);
  const [form,      setForm]      = useState({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '', use_tls: true });
  const [preset,    setPreset]    = useState('Custom');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  useEffect(() => {
    api.get('/api/email')
      .then(s => {
        if (s.configured) {
          setConfig(s);
          setForm({
            smtp_host: s.smtp_host,
            smtp_port: s.smtp_port,
            smtp_user: s.smtp_user,
            smtp_pass: '',
            smtp_from: s.smtp_from,
            use_tls: Boolean(s.use_tls),
          });
          const match = PRESETS.find(p => p.host === s.smtp_host);
          if (match) setPreset(match.label);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function applyPreset(label) {
    setPreset(label);
    const p = PRESETS.find(x => x.label === label);
    if (p && p.host) {
      setForm(f => ({ ...f, smtp_host: p.host, smtp_port: p.port, use_tls: p.port !== 465 }));
    }
  }

  async function save() {
    setError(''); setSuccess('');
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass || !form.smtp_from) {
      setError('All fields except password (when editing) are required');
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/email', form);
      setSuccess('Saved. Now verify the connection.');
      const s = await api.get('/api/email');
      setConfig(s);
      setForm(f => ({ ...f, smtp_pass: '' })); // clear password after save
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function verify() {
    setError(''); setSuccess('');
    setVerifying(true);
    try {
      await api.post('/api/email/verify');
      setSuccess('SMTP connection verified successfully');
      const s = await api.get('/api/email');
      setConfig(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  }

  async function remove() {
    if (!confirm('Delete SMTP configuration? Email notifications will stop working.')) return;
    setError(''); setSuccess('');
    setDeleting(true);
    try {
      await api.delete('/api/email');
      setConfig(null);
      setForm({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '', use_tls: true });
      setSuccess('SMTP configuration removed');
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="animate-in" style={{ maxWidth: 600, margin: '0 auto', color: '#fff' }}>Loading…</div>;
  }

  return (
    <div className="animate-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Email Settings</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Configure your own SMTP server. Notifications for your jobs will be sent from your email account.
      </p>

      {config?.configured && (
        <div className="card" style={{ marginBottom: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: config.is_verified ? '#22c55e' : '#f59e0b',
            boxShadow: `0 0 8px ${config.is_verified ? '#22c55e80' : '#f59e0b80'}`,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600 }}>{config.smtp_user}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: 13 }}>
              {config.smtp_host}:{config.smtp_port} —
              {config.is_verified
                ? <span style={{ color: '#22c55e' }}> Verified</span>
                : <span style={{ color: '#f59e0b' }}> Not verified</span>}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--gray-300)', fontSize: 13 }}>Provider</label>
          <select
            className="input"
            value={preset}
            onChange={e => applyPreset(e.target.value)}
            style={{ width: '100%' }}
          >
            {PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--gray-300)', fontSize: 13 }}>SMTP Host</label>
          <input
            className="input"
            value={form.smtp_host}
            onChange={e => setForm({ ...form, smtp_host: e.target.value })}
            placeholder="smtp.gmail.com"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--gray-300)', fontSize: 13 }}>Port</label>
            <input
              className="input"
              type="number"
              value={form.smtp_port}
              onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value, 10) || 587 })}
              style={{ width: '100%' }}
            />
          </div>
          <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-300)', fontSize: 13, paddingBottom: 10 }}>
              <input
                type="checkbox"
                checked={form.use_tls}
                onChange={e => setForm({ ...form, use_tls: e.target.checked })}
              />
              Use TLS / STARTTLS
            </label>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--gray-300)', fontSize: 13 }}>Username</label>
          <input
            className="input"
            value={form.smtp_user}
            onChange={e => setForm({ ...form, smtp_user: e.target.value })}
            placeholder="your@email.com"
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--gray-300)', fontSize: 13 }}>
            Password / App Password {config?.configured && <span style={{ color: 'var(--gray-500)' }}>(leave blank to keep current)</span>}
          </label>
          <input
            className="input"
            type="password"
            value={form.smtp_pass}
            onChange={e => setForm({ ...form, smtp_pass: e.target.value })}
            placeholder={config?.configured ? '••••••••' : 'your-password-or-app-password'}
            style={{ width: '100%' }}
          />
          {form.smtp_host.includes('gmail') && (
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              Gmail requires an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>App Password</a> (not your account password).
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'var(--gray-300)', fontSize: 13 }}>From Address</label>
          <input
            className="input"
            value={form.smtp_from}
            onChange={e => setForm({ ...form, smtp_from: e.target.value })}
            placeholder="alerts@yourdomain.com"
            style={{ width: '100%' }}
          />
        </div>

        {error   && <div style={{ padding: 10, background: '#ef444420', color: '#ef4444', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ padding: 10, background: '#22c55e20', color: '#22c55e', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{success}</div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={save} disabled={saving || verifying}>
            {saving ? 'Saving…' : <><Icon name="check" size={16} /> Save</>}
          </button>
          {config?.configured && (
            <>
              <button className="btn btn-secondary" onClick={verify} disabled={verifying || saving}>
                {verifying ? 'Verifying…' : <><Icon name="refresh" size={16} /> Verify Connection</>}
              </button>
              <button className="btn btn-danger" onClick={remove} disabled={deleting || saving}>
                {deleting ? 'Deleting…' : <><Icon name="trash" size={16} /> Remove</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
