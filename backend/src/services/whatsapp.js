const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, '../../../auth_info');

// Minimal silent logger so Baileys doesn't spam stdout
const silentLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn: () => {}, error: () => {}, fatal: () => {},
  child: function () { return this; },
};

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'awaiting_qr' | 'connected'
let currentQRDataURL = null;
let reconnectTimer = null;

async function connectWhatsApp() {
  if (connectionStatus === 'connected' || connectionStatus === 'connecting') return;
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

      if (loggedOut) {
        connectionStatus = 'disconnected';
        console.log('[WhatsApp] Logged out — rescan QR to reconnect');
      } else {
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
  if (v.includes('@')) return v; // already a JID
  // Strip leading zeros, spaces, dashes, plus
  v = v.replace(/[\s\-+]/g, '');
  if (v.startsWith('60')) {
    // already has country code
  } else if (v.startsWith('0')) {
    v = '6' + v.slice(1); // replace leading 0 with 60
  } else if (v.startsWith('1')) {
    v = '60' + v; // assume Malaysian number without prefix
  }
  return v + '@s.whatsapp.net';
}

async function sendWhatsApp(jid, message, imagePaths) {
  if (connectionStatus !== 'connected' || !sock) {
    throw new Error(`WhatsApp not connected (status: ${connectionStatus})`);
  }
  const normalized = normalizeJid(jid);
  // imagePaths can be a single path string or array of paths
  const paths = imagePaths ? (Array.isArray(imagePaths) ? imagePaths : [imagePaths]) : [];
  const validPaths = paths.filter(p => fs.existsSync(p));

  if (validPaths.length === 0) {
    await sock.sendMessage(normalized, { text: message });
  } else if (validPaths.length === 1) {
    await sock.sendMessage(normalized, { image: { url: validPaths[0] }, caption: message });
  } else {
    // Multiple images: send each one, first with caption
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
    try { await sock.logout(); } catch (e) { /* may already be closed */ }
    try { await sock.end(new Error('manual disconnect')); } catch (e) { /* noop */ }
    sock = null;
  }
  connectionStatus = 'disconnected';
  currentQRDataURL = null;
  console.log('[WhatsApp] Disconnected (manual)');
}

module.exports = { connectWhatsApp, disconnectWhatsApp, sendWhatsApp, getWhatsAppState };
