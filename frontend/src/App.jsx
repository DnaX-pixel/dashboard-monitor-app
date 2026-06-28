import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import JobForm from './pages/JobForm';
import JobHistory from './pages/JobHistory';
import CompareView from './pages/CompareView';
import WhatsApp from './pages/WhatsApp';
import EmailSettings from './pages/EmailSettings';
import HealthCheck from './pages/HealthCheck';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

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
  '/profile': 'Profile',
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/edit')) return 'Edit Job';
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/history')) return 'Run History';
  if (pathname.startsWith('/jobs/') && pathname.endsWith('/compare')) return 'Compare Runs';
  return 'Dashboard Monitor';
}

function Layout({ children, title }) {
  return <AppShell title={title}>{children}</AppShell>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/" element={<PrivateRoute><Layout title="Monitoring Jobs"><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/jobs/new" element={<PrivateRoute><Layout title="New Job"><JobForm /></Layout></PrivateRoute>} />
          <Route path="/jobs/:id/edit" element={<PrivateRoute><Layout title="Edit Job"><JobForm /></Layout></PrivateRoute>} />
          <Route path="/jobs/:id/history" element={<PrivateRoute><Layout title="Run History"><JobHistory /></Layout></PrivateRoute>} />
          <Route path="/jobs/:id/compare" element={<PrivateRoute><Layout title="Compare Runs"><CompareView /></Layout></PrivateRoute>} />
          <Route path="/whatsapp" element={<PrivateRoute><Layout title="WhatsApp Connection"><WhatsApp /></Layout></PrivateRoute>} />
          <Route path="/email" element={<PrivateRoute><Layout title="Email Settings"><EmailSettings /></Layout></PrivateRoute>} />
          <Route path="/health" element={<PrivateRoute><Layout title="System Health"><HealthCheck /></Layout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Layout title="Profile"><Profile /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}