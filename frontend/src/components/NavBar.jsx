import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';
import Icon from './Icon';

const WA_COLORS = {
  connected:    '#22c55e',
  awaiting_qr:  '#f59e0b',
  connecting:   '#f59e0b',
  disconnected: '#ef4444',
  error:        '#ef4444',
  loading:      '#94a3b8',
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [waStatus, setWaStatus] = useState('loading');
  const [now, setNow] = useState('');

  useEffect(() => {
    const poll = () =>
      api.get('/api/whatsapp/status')
        .then(s => setWaStatus(s.status))
        .catch(() => setWaStatus('error'));
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const opts = { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const dateOpts = { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: 'short', year: 'numeric' };
      setNow(`${d.toLocaleDateString('en-MY', dateOpts)} ${d.toLocaleTimeString('en-MY', opts)}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/"><span className="nav-icon"><Icon name="monitor" size={20} /></span> Dashboard Monitor</Link>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}><Icon name="jobs" size={16} /> Jobs</Link>
        <Link to="/whatsapp" className={isActive('/whatsapp') ? 'active' : ''}>
          <span className={`wa-dot ${waStatus}`} style={{ background: WA_COLORS[waStatus] || '#94a3b8' }} />
          <Icon name="whatsapp" size={16} /> WhatsApp
        </Link>
        <Link to="/health" className={isActive('/health') ? 'active' : ''}><Icon name="heart" size={16} /> Health</Link>
      </div>
      <div className="nav-user">
        <span className="clock-badge">{now}</span>
        <span className="user-badge">{user?.email}</span>
        <button onClick={() => { logout(); navigate('/login'); }}>
          <Icon name="logout" size={14} /> Logout
        </button>
      </div>
    </nav>
  );
}