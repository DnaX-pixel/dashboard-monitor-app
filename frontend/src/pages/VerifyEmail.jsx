import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState('verifying');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    api.get(`/api/auth/verify-email?token=${token}`)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  const meta = {
    verifying: { icon: 'progress_activity', color: '#c0c1ff', title: 'Verifying…', spin: true },
    success:   { icon: 'check_circle', color: '#10b981', title: 'Email Verified' },
    error:     { icon: 'error', color: '#f43f5e', title: 'Verification Failed' },
  }[state];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 rounded-full bg-secondary/5 blur-3xl"></div>
        <div className="absolute bottom-[10%] right-[15%] w-96 h-96 rounded-full bg-primary/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-md w-full text-center">
        <div className="glass-panel border border-border-subtle rounded-xl p-8">
          <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4" style={{ background: meta.color + '20', border: `2px solid ${meta.color}` }}>
            <span className={`material-symbols-outlined text-3xl ${meta.spin ? 'animate-spin-slow' : ''}`} style={{ color: meta.color }}>{meta.icon}</span>
          </div>
          <h1 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-2">{meta.title}</h1>
          <p className="text-text-dim text-sm mb-6">
            {state === 'success' && 'Your email is now verified. You can close this tab.'}
            {state === 'error' && 'The link is invalid or has expired. Try logging in to request a new one.'}
            {state === 'verifying' && 'Please wait while we verify your email…'}
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}