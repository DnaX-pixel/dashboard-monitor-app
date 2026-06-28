import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

function formatDate(d) { return d ? new Date(d).toLocaleString() : '—'; }
function maskIp(ip) {
  if (!ip) return '—';
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.***.${parts[3]}` : (ip.length > 12 ? ip.slice(0, 8) + '***' : ip);
}
function maskUa(ua) { return !ua ? '—' : (ua.length > 50 ? ua.slice(0, 47) + '…' : ua); }

export default function Profile() {
  const { logout } = useAuth();
  const [me, setMe] = useState(null);
  const [history, setHistory] = useState([]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changing, setChanging] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  async function load() {
    try {
      const u = await api.get('/api/auth/me');
      setMe(u); setName(u.name);
      setHistory(await api.get('/api/auth/login-history'));
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function saveName(e) {
    e.preventDefault(); setError(''); setSuccess(''); setSavingName(true);
    try { const u = await api.put('/api/auth/profile', { name }); setMe(u); setSuccess('Name updated'); }
    catch (e) { setError(e.message); } finally { setSavingName(false); }
  }

  async function changePassword(e) {
    e.preventDefault(); setError(''); setSuccess('');
    if (newPwd.length < 8) return setError('New password must be at least 8 characters');
    setChanging(true);
    try { await api.post('/api/auth/change-password', { current_password: curPwd, new_password: newPwd }); setSuccess('Password changed successfully'); setCurPwd(''); setNewPwd(''); }
    catch (e) { setError(e.message); } finally { setChanging(false); }
  }

  async function resendVerification() {
    setResending(true); setResendMsg('');
    try { const r = await api.post('/api/auth/resend-verification'); setResendMsg(r.message); }
    catch (e) { setResendMsg(e.message); } finally { setResending(false); }
  }

  if (!me) return <div className="flex items-center justify-center py-20"><span className="material-symbols-outlined animate-spin-slow text-text-dim">progress_activity</span></div>;

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto">
      <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-6">Profile</h2>

      {error && <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm mb-4 flex items-center gap-2"><span className="material-symbols-outlined">error</span>{error}</div>}
      {success && <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm mb-4 flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

      {/* Account */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-4">
        <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4">Account</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="User ID" value={`#${me.user_id}`} />
          <Field label="Email" value={me.email} />
          <Field label="Role" value={me.is_admin ? 'Admin' : 'User'} />
          <Field label="Member since" value={formatDate(me.created_at)} />
          <Field label="Last login" value={formatDate(me.last_login_at)} />
          <Field label="Last login IP" value={maskIp(me.last_login_ip)} />
          <Field label="Email verified" value={me.email_verified ? 'Yes' : 'No'} highlight={!me.email_verified} />
        </div>

        {!me.email_verified && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="text-warning font-bold mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-base">warning</span> Email not verified</div>
            <div className="text-text-dim text-xs mb-2">Configure your SMTP in <a href="/email" className="text-primary">Email Settings</a> first to enable verification.</div>
            <button onClick={resendVerification} disabled={resending} className="px-3 py-1.5 bg-surface-container-high border border-border-subtle rounded-lg text-xs text-text-primary hover:bg-surface-interactive disabled:opacity-50">{resending ? 'Sending…' : 'Resend verification email'}</button>
            {resendMsg && <div className="text-text-dim text-xs mt-2">{resendMsg}</div>}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-4">
        <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4">Display Name</h3>
        <form onSubmit={saveName} className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} maxLength={100} required className="flex-1 bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <button type="submit" disabled={savingName || name === me.name} className="indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all">{savingName ? 'Saving…' : 'Save'}</button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-4">
        <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4">Change Password</h3>
        <form onSubmit={changePassword}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input type="password" placeholder="Current password" value={curPwd} onChange={e => setCurPwd(e.target.value)} required className="bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <input type="password" placeholder="New password (min 8 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)} required className="bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="submit" disabled={changing} className="indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all">{changing ? 'Changing…' : 'Change Password'}</button>
        </form>
      </div>

      {/* Login history */}
      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-4">
        <h3 className="font-[Plus_Jakarta_Sans] text-base font-bold text-text-primary mb-4">Recent Login Activity</h3>
        {history.length === 0 ? <div className="text-text-dim text-sm">No history yet</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-dim text-left text-xs">
                <th className="py-2 font-bold uppercase tracking-wider">When</th>
                <th className="py-2 font-bold uppercase tracking-wider">Status</th>
                <th className="py-2 font-bold uppercase tracking-wider">IP</th>
                <th className="py-2 font-bold uppercase tracking-wider">Device</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="border-t border-border-subtle">
                  <td className="py-2 text-text-muted font-[JetBrains_Mono] text-xs">{formatDate(h.created_at)}</td>
                  <td className="py-2"><span className={h.success ? 'text-success' : 'text-error'}>{h.success ? 'Success' : 'Failed'}</span></td>
                  <td className="py-2 text-text-dim font-[JetBrains_Mono] text-xs">{maskIp(h.ip)}</td>
                  <td className="py-2 text-text-dim text-xs">{maskUa(h.user_agent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-center">
        <button onClick={logout} className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container-high border border-border-subtle rounded-lg text-sm text-text-primary hover:bg-surface-interactive transition-colors">
          <span className="material-symbols-outlined">logout</span> Logout
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div>
      <div className="text-text-dim text-xs mb-1">{label}</div>
      <div className="font-medium" style={{ color: highlight ? '#f59e0b' : '#e8eaf2' }}>{value}</div>
    </div>
  );
}