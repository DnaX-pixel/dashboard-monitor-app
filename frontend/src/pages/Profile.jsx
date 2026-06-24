import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import Icon from '../components/Icon';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function maskIp(ip) {
  if (!ip) return '—';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
  }
  return ip.length > 12 ? ip.slice(0, 8) + '***' : ip;
}

function maskUa(ua) {
  if (!ua) return '—';
  return ua.length > 50 ? ua.slice(0, 47) + '…' : ua;
}

export default function Profile() {
  const { token, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [history, setHistory] = useState([]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Change password
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changing, setChanging] = useState(false);

  // Resend verification
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  async function load() {
    try {
      const u = await api.get('/api/auth/me');
      setMe(u);
      setName(u.name);
      const h = await api.get('/api/auth/login-history');
      setHistory(h);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveName(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSavingName(true);
    try {
      const u = await api.put('/api/auth/profile', { name });
      setMe(u);
      setSuccess('Name updated');
    } catch (e) { setError(e.message); }
    finally { setSavingName(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPwd.length < 8) return setError('New password must be at least 8 characters');
    setChanging(true);
    try {
      await api.post('/api/auth/change-password', { current_password: curPwd, new_password: newPwd });
      setSuccess('Password changed successfully');
      setCurPwd(''); setNewPwd('');
    } catch (e) { setError(e.message); }
    finally { setChanging(false); }
  }

  async function resendVerification() {
    setResending(true);
    setResendMsg('');
    try {
      const r = await api.post('/api/auth/resend-verification');
      setResendMsg(r.message);
    } catch (e) {
      setResendMsg(e.message);
    } finally {
      setResending(false);
    }
  }

  if (!me) {
    return <div className="animate-in" style={{ color: '#fff' }}>Loading…</div>;
  }

  return (
    <div className="animate-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24, color: '#fff' }}>Profile</h1>

      {error   && <div style={{ padding: 10, background: '#ef444420', color: '#ef4444', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: 10, background: '#22c55e20', color: '#22c55e', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{success}</div>}

      {/* Account info */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>Account</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <Field label="User ID" value={`#${me.user_id}`} />
          <Field label="Email"   value={me.email} />
          <Field label="Role"    value={me.is_admin ? 'Admin' : 'User'} />
          <Field label="Member since" value={formatDate(me.created_at)} />
          <Field label="Last login"   value={formatDate(me.last_login_at)} />
          <Field label="Last login IP" value={maskIp(me.last_login_ip)} />
          <Field label="Email verified" value={me.email_verified ? 'Yes' : 'No'} highlight={!me.email_verified} />
        </div>

        {!me.email_verified && (
          <div style={{ padding: 12, background: '#f59e0b20', border: '1px solid #f59e0b40', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>
              <Icon name="alert" size={16} /> Email not verified
            </div>
            <div style={{ color: 'var(--gray-400)', fontSize: 13, marginBottom: 8 }}>
              To send verification emails, configure your SMTP in <a href="/email" style={{ color: 'var(--primary)' }}>Email Settings</a> first.
            </div>
            <button className="btn btn-sm btn-secondary" onClick={resendVerification} disabled={resending}>
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
            {resendMsg && <div style={{ color: 'var(--gray-300)', fontSize: 12, marginTop: 8 }}>{resendMsg}</div>}
          </div>
        )}
      </div>

      {/* Update name */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>Display Name</h2>
        <form onSubmit={saveName} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1 }}
            maxLength={100}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={savingName || name === me.name}>
            {savingName ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>Change Password</h2>
        <form onSubmit={changePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={curPwd}
              onChange={e => setCurPwd(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="New password (min 8 chars)"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={changing}>
            {changing ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Login history */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>Recent Login Activity</h2>
        {history.length === 0 ? (
          <div style={{ color: 'var(--gray-400)' }}>No history yet</div>
        ) : (
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--gray-400)', textAlign: 'left' }}>
                <th style={{ padding: 6 }}>When</th>
                <th style={{ padding: 6 }}>Status</th>
                <th style={{ padding: 6 }}>IP</th>
                <th style={{ padding: 6 }}>Device</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ borderTop: '1px solid var(--gray-700, #334155)' }}>
                  <td style={{ padding: 6, color: 'var(--gray-300)' }}>{formatDate(h.created_at)}</td>
                  <td style={{ padding: 6, color: h.success ? '#22c55e' : '#ef4444' }}>
                    {h.success ? 'Success' : 'Failed'}
                  </td>
                  <td style={{ padding: 6, color: 'var(--gray-400)' }}>{maskIp(h.ip)}</td>
                  <td style={{ padding: 6, color: 'var(--gray-500)', fontSize: 11 }}>{maskUa(h.user_agent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={logout}>
          <Icon name="logout" size={16} /> Logout
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div>
      <div style={{ color: 'var(--gray-400)', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: highlight ? '#f59e0b' : '#fff', fontWeight: 500 }}>{value}</div>
    </div>
  );
}