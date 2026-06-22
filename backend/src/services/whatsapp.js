const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, '../../../auth_info');

const silentLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn: () => {}, error: () => {}, fatal: () => {},
  child: function () { return this; },
};

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'awaiting_qr' | 'connected'
let currentQRDataURL = null;
let reconnectTimer = null;

function clearAuthSession() {
  // Delete saved session so we get a fresh QR (used when loggedOut or after manual disconnect)
  try {
    if (fs.existsSync(AUTH_DIR)) {
      for (const f of fs.readdirSync(AUTH_DIR)) {
        fs.rmSync(path.join(AUTH_DIR, f), { recursive: true, force: true });
      }
      console.log('[WhatsApp] Auth session cleared');
    }
  } catch (e) {
    console.warn('[WhatsApp] Failed to clear auth session:', e.message);
  }
}

async function connectWhatsApp() {
  if (connectionStatus === 'connected' || connectionStatus === 'connecting' || connectionStatus === 'awaiting_qr') {
    console.log(`[WhatsApp] Already ${connectionStatus}, skipping connect attempt`);
    return;
  }
  connectionStatus = 'connecting';

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: silentLogger,
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQRDataURL = await QRCode.toDataURL(qr);
      connectionStatus = 'awaiting_qr';
      console.log('[WhatsApp] QR ready — GET /api/whatsapp/qr to retrieve it');
    }

    if (connection === 'open') {
      connectionStatus = 'connected';
      currentQRDataURL = null;
      console.log('[WhatsApp] Connected');
    }

    if (connection === 'close') {
      currentQRDataURL = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;

      if (sock) {
        try { sock.end(undefined); } catch (e) {}
        sock = null;
      }

      if (loggedOut) {
        // Session invalidated — clear and wait for manual reconnect
        clearAuthSession();
        connectionStatus = 'disconnected';
        console.log('[WhatsApp] Logged out — clear session, awaiting QR rescan');
      } else {
        // Transient disconnect — auto-reconnect after 5s
        connectionStatus = 'disconnected';
        console.log('[WhatsApp] Disconnected, reconnecting in 5s...');
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWhatsApp, 5000);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

function normalizeJid(value) {
  let v = String(value || '').trim();
  if (v.includes('@')) return v;
  v = v.replace(/[\s\-+]/g, '');
  if (v.startsWith('60')) {
    // already has country code
  } else if (v.startsWith('0')) {
    v = '6' + v.slice(1);
  } else if (v.startsWith('1')) {
    v = '60' + v;
  }
  return v + '@s.whatsapp.net';
}

async function sendWhatsApp(jid, message, imagePaths) {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error(`WhatsApp not connected (status: ${connectionStatus})`);
  }
  const normalized = normalizeJid(jid);
  const paths = imagePaths ? (Array.isArray(imagePaths) ? imagePaths : [imagePaths]) : [];
  const validPaths = paths.filter(p => fs.existsSync(p));

  if (validPaths.length === 0) {
    await sock.sendMessage(normalized, { text: message });
  } else if (validPaths.length === 1) {
    await sock.sendMessage(normalized, { image: { url: validPaths[0] }, caption: message });
  } else {
    for (let i = 0; i < validPaths.length; i++) {
      const caption = i === 0 ? message : '';
      await sock.sendMessage(normalized, { image: { url: validPaths[i] }, caption });
    }
  }
}

function getWhatsAppState() {
  return { status: connectionStatus, qr: currentQRDataURL };
}

async function disconnectWhatsApp() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try { await sock.logout(); } catch (e) {}
    sock = null;
  }
  // Clear session and auto-generate new QR — user expects to scan new QR after disconnect
  clearAuthSession();
  connectionStatus = 'disconnected';
  currentQRDataURL = null;
  console.log('[WhatsApp] Disconnected (manual) — clearing session');

  // Kick off fresh connect to generate new QR
  setTimeout(() => connectWhatsApp().catch(e => console.error('[WhatsApp] Reconnect after disconnect failed:', e.message)), 1000);
}

module.exports = { connectWhatsApp, disconnectWhatsApp, sendWhatsApp, getWhatsAppState };