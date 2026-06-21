import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';
import Icon from './Icon';

const WA_COLORS = {
  connected:    '#10b981',
  awaiting_qr:  '#f59e0b',
  connecting:   '#f59e0b',
  disconnected: '#f43f5e',
  error:        '#f43f5e',
  loading:      '#7b8095',
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [waStatus, setWaStatus] = useState('loading');

  useEffect(() => {
    const poll = () => api.get('/api/whatsapp/status').then(s => setWaStatus(s.status)).catch(() => setWaStatus('error'));
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  const isActive = (path) => location.pathname === path;
  const initials = (user?.email || 'U')[0].toUpperCase();

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon"><Icon name="monitor" size={20} /></div>
        <div>
          <div className="brand-text">Dashboard Monitor</div>
          <div className="brand-sub">Monitoring &amp; Alerts</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`} onClick={onClose}>
          <Icon name="jobs" size={18} /> Jobs
        </Link>
        <Link to="/whatsapp" className={`sidebar-link ${isActive('/whatsapp') ? 'active' : ''}`} onClick={onClose}>
          <Icon name="whatsapp" size={18} /> WhatsApp
          <span className={`badge-nav`} style={{
            background: WA_COLORS[waStatus] ? `${WA_COLORS[waStatus]}20` : '',
            color: WA_COLORS[waStatus] || '',
          }}>
            <span className="topbar-wa-dot" style={{ background: WA_COLORS[waStatus] || '#7b8095', width: 6, height: 6, borderRadius: '50%' }} />
          </span>
        </Link>
        <Link to="/health" className={`sidebar-link ${isActive('/health') ? 'active' : ''}`} onClick={onClose}>
          <Icon name="heart" size={18} /> System Health
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.email?.split('@')[0] || 'User'}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => { logout(); navigate('/login'); }} title="Logout">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}