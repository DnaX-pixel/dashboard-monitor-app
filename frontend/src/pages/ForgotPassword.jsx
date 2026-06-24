import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

export default function ForgotPassword() {
  const [email,      setEmail]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon"><Icon name="key" size={32} /></div>
        <h1 style={{ color: '#fff' }}>Forgot Password</h1>
        <p style={{ color: 'var(--gray-400)', marginBottom: 20 }}>
          Enter your email and we'll send you a reset link.
        </p>

        {done ? (
          <div style={{ padding: 16, background: '#22c55e20', color: '#22c55e', borderRadius: 8, textAlign: 'center' }}>
            <Icon name="check" size={20} /> If an account exists, a reset link has been sent to <strong>{email}</strong>.
            <div style={{ marginTop: 12, fontSize: 13 }}>
              Note: the email is sent from your own SMTP — make sure you've configured it in Email Settings first.
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <input
              className="input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', marginBottom: 12 }}
            />
            {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Sending…' : 'Send Reset Link'}
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