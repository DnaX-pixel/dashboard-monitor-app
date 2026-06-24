import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import Icon from '../components/Icon';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const res = await api.post(path, body);
      login(res.token, res.user);
      if (mode === 'register' && res.verificationSent) {
        // Show success message before navigating
        setError('');
        alert('Account created! Check your email (from your configured SMTP) to verify. Redirecting to dashboard…');
      } else if (mode === 'register' && !res.verificationSent) {
        alert('Account created. Configure your SMTP at /email to enable email verification.');
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Visual side */}
      <div className="auth-visual">
        <div className="auth-visual-content">
          <h2>Monitor any website.<br />Get alerted on change.</h2>
          <p>Automated screenshot monitoring with AI-powered OCR. Track dashboard changes and receive instant notifications via Email &amp; WhatsApp — only when content actually changes.</p>

          <div className="auth-feature">
            <div className="feat-icon"><Icon name="capture" size={20} /></div>
            <div className="feat-text">Automated screenshots with precise crop areas</div>
          </div>
          <div className="auth-feature">
            <div className="feat-icon"><Icon name="search" size={20} /></div>
            <div className="feat-text">AI OCR text extraction (Ollama vision LLM)</div>
          </div>
          <div className="auth-feature">
            <div className="feat-icon"><Icon name="mail" size={20} /></div>
            <div className="feat-text">Email &amp; WhatsApp notifications on change</div>
          </div>
          <div className="auth-feature">
            <div className="feat-icon"><Icon name="schedule" size={20} /></div>
            <div className="feat-text">Flexible scheduling — interval or alarm mode</div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-logo"><Icon name="monitor" size={24} /></div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="auth-sub">{mode === 'login' ? 'Sign in to your dashboard' : 'Start monitoring in minutes'}</p>

          <div className="tab-bar">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Full Name</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Enter your password" minLength={8} />
            </div>
            {error && <div className="error-msg"><Icon name="alert" size={16} /> {error}</div>}
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8, padding: '13px' }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
                <a href="/forgot-password" style={{ color: 'var(--primary)' }}>Forgot password?</a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}