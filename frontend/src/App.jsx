import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import NavBar      from './components/NavBar';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import JobForm     from './pages/JobForm';
import JobHistory  from './pages/JobHistory';
import CompareView from './pages/CompareView';
import WhatsApp    from './pages/WhatsApp';
import HealthCheck  from './pages/HealthCheck';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return (
    <>
      <NavBar />
      <div className="page-wrap">{children}</div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          } />
          <Route path="/jobs/new" element={
            <PrivateRoute>
              <Layout><JobForm /></Layout>
            </PrivateRoute>
          } />
          <Route path="/jobs/:id/edit" element={
            <PrivateRoute>
              <Layout><JobForm /></Layout>
            </PrivateRoute>
          } />
          <Route path="/jobs/:id/history" element={
            <PrivateRoute>
              <Layout><JobHistory /></Layout>
            </PrivateRoute>
          } />
          <Route path="/jobs/:id/compare" element={
            <PrivateRoute>
              <Layout><CompareView /></Layout>
            </PrivateRoute>
          } />
          <Route path="/whatsapp" element={
            <PrivateRoute>
              <Layout><WhatsApp /></Layout>
            </PrivateRoute>
          } />
          <Route path="/health" element={
            <PrivateRoute>
              <Layout><HealthCheck /></Layout>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
