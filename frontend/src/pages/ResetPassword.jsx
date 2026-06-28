import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!token) setError('Invalid reset link'); }, [token]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 rounded-full bg-secondary/5 blur-3xl"></div>
        <div className="absolute bottom-[10%] right-[15%] w-96 h-96 rounded-full bg-primary/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl indigo-violet-gradient items-center justify-center shadow-[0_0_30px_rgba(128,131,255,0.3)] mb-4">
            <span className="material-symbols-outlined text-white text-3xl">lock</span>
          </div>
          <h1 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary">Set New Password</h1>
        </div>

        <div className="glass-panel border border-border-subtle rounded-xl p-6">
          {done ? (
            <div className="text-center">
              <span className="material-symbols-outlined text-success text-5xl mb-3">check_circle</span>
              <p className="text-success font-bold">Password reset! Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min 8 characters)" autoFocus className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-3 px-4 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-3 px-4 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              {error && <div className="text-error text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">error</span>{error}</div>}
              <button type="submit" disabled={submitting || !token} className="w-full indigo-violet-gradient text-white font-bold text-sm py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-1 font-[DM_Sans] text-sm text-text-dim hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}