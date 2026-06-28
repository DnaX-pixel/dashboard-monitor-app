import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setDone(true);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Atmospheric blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 rounded-full bg-secondary/5 blur-3xl"></div>
        <div className="absolute bottom-[10%] right-[15%] w-96 h-96 rounded-full bg-primary/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl indigo-violet-gradient items-center justify-center shadow-[0_0_30px_rgba(128,131,255,0.3)] mb-4">
            <span className="material-symbols-outlined text-white text-3xl">vpn_key</span>
          </div>
          <h1 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary">Forgot Password</h1>
          <p className="font-[DM_Sans] text-sm text-text-dim mt-2">Enter your email and we'll send you a reset link.</p>
        </div>

        {/* Card */}
        <div className="glass-panel border border-border-subtle rounded-xl p-6">
          {done ? (
            <div className="text-center">
              <span className="material-symbols-outlined text-success text-5xl mb-3">check_circle</span>
              <p className="text-success font-bold mb-2">Email Sent</p>
              <p className="text-text-dim text-sm">If an account exists, a reset link has been sent to <strong className="text-text-primary">{email}</strong>.</p>
              <p className="text-text-muted text-xs mt-4">Note: the email is sent from your own SMTP — configure it in Email Settings first.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-3 pl-12 pr-4 text-text-primary text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {error && <div className="text-error text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">error</span>{error}</div>}
              <button type="submit" disabled={submitting} className="w-full indigo-violet-gradient text-white font-bold text-sm py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <><span className="material-symbols-outlined animate-spin-slow">refresh</span> Sending…</> : <>Send Reset Link <span className="material-symbols-outlined text-lg">arrow_forward</span></>}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-1 font-[DM_Sans] text-sm text-text-dim hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}