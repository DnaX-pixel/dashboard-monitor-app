import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import Sidebar     from './components/Sidebar';
import Topbar      from './components/Topbar';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import JobForm     from './pages/JobForm';
import JobHistory  from './pages/JobHistory';
import CompareView from './pages/CompareView';
import WhatsApp    from './pages/WhatsApp';
import EmailSettings from './pages/EmailSettings';
import HealthCheck  from './pages/HealthCheck';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

const PAGE_TITLES = {
  '/': 'Monitoring Jobs',
  '/jobs/new': 'New Job',
  '/whatsapp': 'WhatsApp Connection',
  '/email': 'Email Settings',
  '/health': 'System Health',
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/edit')) return 'Edit Job';
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/history')) return 'Run History';
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/compare')) return 'Compare Runs';
  return 'Dashboard Monitor';
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <div className="content-area animate-in">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
          } />
          <Route path="/jobs/new" element={
            <PrivateRoute><Layout><JobForm /></Layout></PrivateRoute>
          } />
          <Route path="/jobs/:id/edit" element={
            <PrivateRoute><Layout><JobForm /></Layout></PrivateRoute>
          } />
          <Route path="/jobs/:id/history" element={
            <PrivateRoute><Layout><JobHistory /></Layout></PrivateRoute>
          } />
          <Route path="/jobs/:id/compare" element={
            <PrivateRoute><Layout><CompareView /></Layout></PrivateRoute>
          } />
          <Route path="/whatsapp" element={
            <PrivateRoute><Layout><WhatsApp /></Layout></PrivateRoute>
          } />
          <Route path="/email" element={
            <PrivateRoute><Layout><EmailSettings /></Layout></PrivateRoute>
          } />
          <Route path="/health" element={
            <PrivateRoute><Layout><HealthCheck /></Layout></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}