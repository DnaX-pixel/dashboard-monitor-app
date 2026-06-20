import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const STATUS_META = {
  loading:      { label: 'Checking…',          color: '#94a3b8', icon: '⟳' },
  connecting:   { label: 'Connecting…',         color: '#f59e0b', icon: '⟳' },
  awaiting_qr:  { label: 'Waiting for QR Scan', color: '#f59e0b', icon: '⏳' },
  connected:    { label: 'Connected',            color: '#22c55e', icon: '✓' },
  disconnected: { label: 'Disconnected',         color: '#ef4444', icon: '✕' },
  error:        { label: 'Error',                color: '#ef4444', icon: '⚠' },
};

export default function WhatsApp() {
  const [state,   setState]   = useState({ status: 'loading', qr: null });
  const [connecting, setConnecting] = useState(false);
  const intervalRef = useRef(null);

  async function poll() {
    try {
      const s = await api.get('/api/whatsapp/status');
      if (s.status === 'awaiting_qr') {
        try {
          const q = await api.get('/api/whatsapp/qr');
          setState({ status: q.status, qr: q.qr });
        } catch {
          setState({ status: s.status, qr: null });
        }
      } else {
        setState({ status: s.status, qr: null });
      }
    } catch {
      setState(p => ({ ...p, status: 'error' }));
    }
  }

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 4_000);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line

  async function reconnect() {
    setConnecting(true);
    try { await api.post('/api/whatsapp/connect'); await poll(); }
    catch (err) { alert(err.message); }
    finally { setConnecting(false); }
  }

  const meta = STATUS_META[state.status] || STATUS_META.error;

  return (
    <div className="animate-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24, color: '#fff' }}>WhatsApp Connection</h1>

      <div className="card wa-card">
        <div className="wa-status">
          <span className={`status-dot ${state.status}`} style={{ background: meta.color, color: meta.color }} />
          <span className="status-label">{meta.icon} {meta.label}</span>
        </div>

        {state.status === 'connected' && (
          <p className="wa-ok">✓ WhatsApp is connected. Notifications will be delivered automatically.</p>
        )}

        {state.status === 'awaiting_qr' && state.qr && (
          <div className="qr-section">
            <p style={{ color: 'var(--gray-300)', marginBottom: 4 }}>Scan this QR code with your WhatsApp:</p>
            <img src={state.qr} alt="WhatsApp QR" className="qr-img" />
            <ol className="qr-steps">
              <li>Open WhatsApp on your phone</li>
              <li>Tap <strong>Menu</strong> &rarr; <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong></li>
              <li>Point your camera at the QR code above</li>
            </ol>
          </div>
        )}

        {state.status === 'awaiting_qr' && !state.qr && (
          <p className="text-muted">
            QR code is ready — only admin users can view it here.
          </p>
        )}

        {(state.status === 'disconnected' || state.status === 'error') && (
          <div style={{ marginTop: 16 }}>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              WhatsApp is not connected. Click Reconnect to start the pairing process.
            </p>
            <button className="btn btn-primary" onClick={reconnect} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Reconnect'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}