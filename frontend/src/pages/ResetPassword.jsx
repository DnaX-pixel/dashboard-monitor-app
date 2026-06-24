import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

export default function ResetPassword() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token');
  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,     setDone]       = useState(false);
  const [error,    setError]      = useState('');

  useEffect(() => {
    if (!token) setError('Invalid reset link');
  }, [token]);

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
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon"><Icon name="lock" size={32} /></div>
        <h1 style={{ color: '#fff' }}>Set New Password</h1>

        {done ? (
          <div style={{ padding: 16, background: '#22c55e20', color: '#22c55e', borderRadius: 8, textAlign: 'center' }}>
            <Icon name="check" size={20} /> Password reset! Redirecting to login…
          </div>
        ) : (
          <form onSubmit={submit}>
            <input
              className="input"
              type="password"
              placeholder="New password (min 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 12 }}
              autoFocus
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting || !token} style={{ width: '100%' }}>
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ color: 'var(--primary)', fontSize: 14 }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}