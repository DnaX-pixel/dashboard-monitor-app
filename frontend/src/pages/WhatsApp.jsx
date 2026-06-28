import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const STATUS_META = {
  connected:    { color: '#10b981', label: 'Connected', icon: 'check_circle' },
  awaiting_qr:  { color: '#f59e0b', label: 'Waiting for QR Scan', icon: 'qr_code_scanner' },
  connecting:   { color: '#f59e0b', label: 'Connecting…', icon: 'progress_activity' },
  disconnected: { color: '#f43f5e', label: 'Disconnected', icon: 'error' },
  error:        { color: '#f43f5e', label: 'Error', icon: 'error' },
};

export default function WhatsApp() {
  const [state, setState] = useState({ status: 'loading', qr: null });
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const intervalRef = useRef(null);

  async function poll() {
    try {
      const s = await api.get('/api/whatsapp/status');
      if (s.status === 'awaiting_qr' || s.status === 'disconnected') {
        try { const q = await api.get('/api/whatsapp/qr'); setState({ status: q.status, qr: q.qr }); }
        catch { setState({ status: s.status, qr: null }); }
      } else { setState({ status: s.status, qr: null }); }
    } catch { setState(p => ({ ...p, status: 'error' })); }
  }

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 4000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function reconnect() {
    setConnecting(true);
    try { await api.post('/api/whatsapp/connect'); await poll(); }
    catch (err) { alert(err.message); }
    finally { setConnecting(false); }
  }

  async function disconnect() {
    setDisconnecting(true);
    try { await api.post('/api/whatsapp/disconnect'); await poll(); }
    catch (err) { alert(err.message); }
    finally { setDisconnecting(false); }
  }

  const meta = STATUS_META[state.status] || STATUS_META.error;

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto">
      <h2 className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary mb-2">WhatsApp Connection</h2>
      <p className="font-[DM_Sans] text-sm text-text-dim mb-6">Each user connects their own WhatsApp account. Notifications will be sent from your linked device.</p>

      <div className="bg-surface border border-border-subtle rounded-xl p-6">
        {/* Status header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: meta.color + '20', border: `1.5px solid ${meta.color}` }}>
            <span className="material-symbols-outlined text-xl" style={{ color: meta.color }}>{meta.icon}</span>
          </div>
          <div>
            <div className="font-[Plus_Jakarta_Sans] text-lg font-bold text-text-primary">{meta.label}</div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5" style={{ background: meta.color + '10', color: meta.color }}>
              <span className={`w-1.5 h-1.5 rounded-full ${state.status === 'connected' ? 'glow-pulse' : ''}`} style={{ background: meta.color }} />
              {state.status}
            </span>
          </div>
        </div>

        {/* Connected */}
        {state.status === 'connected' && (
          <>
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2 text-success text-sm mb-4">
              <span className="material-symbols-outlined">verified_user</span> WhatsApp is connected. Notifications will be delivered automatically.
            </div>
            <button onClick={disconnect} disabled={disconnecting} className="px-4 py-2.5 bg-error/10 text-error border border-error/20 rounded-lg font-bold text-sm hover:bg-error hover:text-white transition-all flex items-center gap-2 disabled:opacity-50">
              <span className="material-symbols-outlined">power_off</span> {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </>
        )}

        {/* QR */}
        {state.status === 'awaiting_qr' && state.qr && (
          <div className="text-center">
            <p className="text-text-muted text-sm mb-4">Scan this QR code with your WhatsApp:</p>
            <div className="inline-block p-4 bg-white rounded-2xl shadow-2xl">
              <img src={state.qr} alt="WhatsApp QR" className="max-w-[260px] mx-auto" />
            </div>
            <ol className="text-left text-text-muted text-sm mt-6 ml-8 space-y-2 list-decimal">
              <li>Open WhatsApp on your phone</li>
              <li>Tap <strong>Menu</strong> → <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong></li>
              <li>Point your camera at the QR code above</li>
            </ol>
          </div>
        )}

        {state.status === 'awaiting_qr' && !state.qr && (
          <div className="text-center py-8"><span className="material-symbols-outlined animate-spin-slow text-text-dim text-3xl">progress_activity</span><p className="text-text-muted text-sm mt-2">QR code is loading…</p></div>
        )}

        {/* Disconnected */}
        {(state.status === 'disconnected' || state.status === 'error') && (
          <div>
            <p className="text-text-muted text-sm mb-4">WhatsApp is not connected. Click Connect to start the pairing process.</p>
            <button onClick={reconnect} disabled={connecting} className="indigo-violet-gradient text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50">
              <span className="material-symbols-outlined">link</span> {connecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}