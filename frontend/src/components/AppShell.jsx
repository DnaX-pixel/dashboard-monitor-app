import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';

const WA_COLORS = {
  connected:    '#10b981',
  awaiting_qr:  '#f59e0b',
  connecting:   '#f59e0b',
  disconnected: '#f43f5e',
  error:        '#f43f5e',
  loading:      '#7b8095',
};

export default function AppShell({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [waStatus, setWaStatus] = useState('loading');
  const [now, setNow] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const poll = () => api.get('/api/whatsapp/status').then(s => setWaStatus(s.status)).catch(() => setWaStatus('error'));
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const opts = { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const dateOpts = { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: 'short' };
      setNow(`${d.toLocaleDateString('en-MY', dateOpts)} ${d.toLocaleTimeString('en-MY', opts)}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = (path) => location.pathname === path;
  const initials = (user?.email || 'U')[0].toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-[260px] bg-surface border-r border-border-subtle flex flex-col p-2 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand */}
        <div className="mb-2 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl indigo-violet-gradient flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-2xl">monitor_heart</span>
            </div>
            <div>
              <h1 className="font-[Plus_Jakarta_Sans] text-lg font-extrabold text-text-primary leading-tight">Dashboard Monitor</h1>
              <p className="font-[DM_Sans] text-xs text-text-muted">Monitoring Suite</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2">
          <div className="font-[DM_Sans] text-[10px] font-bold uppercase tracking-widest text-text-dim px-4 py-3">Main</div>
          <NavLink to="/" active={isActive('/')} onClick={() => setSidebarOpen(false)} icon="monitor_heart" label="Jobs" />
          <NavLink to="/whatsapp" active={isActive('/whatsapp')} onClick={() => setSidebarOpen(false)} icon="chat" label="WhatsApp">
            <span className="ml-auto w-2 h-2 rounded-full" style={{ background: WA_COLORS[waStatus] || '#7b8095' }} />
          </NavLink>
          <NavLink to="/email" active={isActive('/email')} onClick={() => setSidebarOpen(false)} icon="mail" label="Email" />
          <NavLink to="/email-presets" active={isActive('/email-presets')} onClick={() => setSidebarOpen(false)} icon="contacts" label="Presets" />
          <NavLink to="/health" active={isActive('/health')} onClick={() => setSidebarOpen(false)} icon="analytics" label="System Health" />
        </nav>

        {/* Footer */}
        <div className="mt-auto px-2 space-y-1 pt-2 border-t border-border-subtle">
          <NavLink to="/profile" active={isActive('/profile')} onClick={() => setSidebarOpen(false)} icon="account_circle" label="Profile" />
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-text-muted font-medium hover:bg-surface-interactive hover:text-primary rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-[DM_Sans] text-[10px] font-bold uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 glass-topbar border-b border-border-subtle flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden text-text-muted" onClick={() => setSidebarOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="relative w-full max-w-md hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">search</span>
              <input
                className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Search monitoring jobs..."
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="font-[Plus_Jakarta_Sans] text-base font-bold text-primary hidden lg:block">{title}</h2>
            <div className="flex items-center gap-2 bg-surface-container-low border border-border-subtle rounded-full px-3 py-1.5">
              <span className="material-symbols-outlined text-sm text-text-muted">schedule</span>
              <span className="font-[JetBrains_Mono] text-xs text-text-muted">{now}</span>
            </div>
            <div className="w-8 h-8 rounded-full indigo-violet-gradient flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-7 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ to, active, onClick, icon, label, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:scale-[0.98] ${
        active
          ? 'bg-surface-interactive text-primary font-bold'
          : 'text-text-muted font-medium hover:bg-surface-interactive hover:text-primary'
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-[DM_Sans] text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {children}
    </Link>
  );
}