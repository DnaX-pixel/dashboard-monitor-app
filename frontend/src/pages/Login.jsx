import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';

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
      const { token, user } = await api.post(path, body);
      login(token, user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1><span className="auth-icon">📊</span> Dashboard Monitor</h1>
        <p className="auth-sub">Website content monitoring &amp; alerts</p>

        <div className="tab-bar">
          <button className={mode === 'login'    ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Name</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Enter your password" />
          </div>
          {error && <div className="error-msg">⚠ {error}</div>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 8, padding: '12px' }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}