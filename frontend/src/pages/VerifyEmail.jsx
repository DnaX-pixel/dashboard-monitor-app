import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    if (!token) { setState('error'); return; }
    api.get(`/api/auth/verify-email?token=${token}`)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-icon" style={{ background: state === 'success' ? '#22c55e20' : '#ef444420' }}>
          <Icon name={state === 'success' ? 'check' : state === 'error' ? 'x' : 'refresh'} size={32} />
        </div>
        <h1 style={{ color: '#fff' }}>
          {state === 'verifying' && 'Verifying…'}
          {state === 'success'  && 'Email Verified'}
          {state === 'error'    && 'Verification Failed'}
        </h1>
        <p style={{ color: 'var(--gray-400)' }}>
          {state === 'success' && 'Your email is now verified. You can close this tab.'}
          {state === 'error'   && 'The link is invalid or has expired. Try logging in to request a new one.'}
        </p>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}