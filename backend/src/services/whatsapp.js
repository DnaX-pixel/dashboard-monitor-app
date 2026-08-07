const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { queryGet, queryRun } = require('../db/database');

const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, '../../../auth_info');
const silentLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn: () => {}, error: () => {}, fatal: () => {},
  child: function () { return this; },
};

// Per-user connection state
// userId -> { sock, status, qr, reconnectTimer, authDir }
const sessions = new Map();

function getAuthDir(userId) {
  const dir = path.join(AUTH_DIR, String(userId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function persistStatus(userId, status, extras = {}) {
  try {
    await queryRun(
      `INSERT INTO whatsapp_sessions (user_id, status, phone_number, push_name, connected_at, last_error, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         phone_number = VALUES(phone_number),
         push_name = VALUES(push_name),
         connected_at = VALUES(connected_at),
         last_error = VALUES(last_error),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        status,
        extras.phone_number || null,
        extras.push_name || null,
        extras.connected_at || null,
        extras.last_error || null,
      ]
    );
  } catch (e) {
    console.error(`[WhatsApp ${userId}] Failed to persist status:`, e.message);
  }
}

// Baileys refetches group metadata on every send to a group unless a cache is
// supplied. Jobs can fire often and send one message per screenshot, so without
// this each run costs several extra round-trips and risks rate limiting.
const GROUP_CACHE_TTL_MS = 5 * 60 * 1000;
const groupMetaCache = new Map(); // `${userId}:${jid}` -> { at, meta }

async function getCachedGroupMetadata(userId, jid) {
  const key = `${userId}:${jid}`;
  const hit = groupMetaCache.get(key);
  if (hit && Date.now() - hit.at < GROUP_CACHE_TTL_MS) return hit.meta;

  const session = sessions.get(userId);
  if (!session?.sock) return undefined; // let Baileys fall back to its own fetch
  try {
    const meta = await session.sock.groupMetadata(jid);
    groupMetaCache.set(key, { at: Date.now(), meta });
    return meta;
  } catch (e) {
    return undefined;
  }
}

function getOrCreateSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      sock: null,
      status: 'disconnected',
      qr: null,
      reconnectTimer: null,
    });
  }
  return sessions.get(userId);
}

async function connectWhatsApp(userId) {
  const session = getOrCreateSession(userId);
  if (session.status === 'connected' || session.status === 'connecting' || session.status === 'awaiting_qr') {
    return; // already active
  }
  session.status = 'connecting';
  await persistStatus(userId, 'connecting');

  let state, saveCreds, version;
  try {
    const authDir = getAuthDir(userId);
    ({ state, saveCreds } = await useMultiFileAuthState(authDir));
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    // Never leave the session stuck in 'connecting' — the guard above would
    // then reject every future attempt until the process restarts.
    session.status = 'disconnected';
    await persistStatus(userId, 'disconnected', { last_error: `setup_failed: ${e.message}` });
    console.error(`[WhatsApp ${userId}] Setup failed, retrying in 30s:`, e.message);
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = setTimeout(() => connectWhatsApp(userId).catch(() => {}), 30000);
    return;
  }

  session.sock = makeWASocket({
    version,
    auth: state,
    logger: silentLogger,
    printQRInTerminal: false,
    cachedGroupMetadata: async (jid) => getCachedGroupMetadata(userId, jid),
  });

  session.sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.qr = await QRCode.toDataURL(qr);
      session.status = 'awaiting_qr';
      await persistStatus(userId, 'awaiting_qr');
      console.log(`[WhatsApp ${userId}] QR ready`);
    }

    if (connection === 'open') {
      session.status = 'connected';
      session.qr = null;
      // Try to read phone number from creds
      let phone = null, pushName = null;
      try {
        const creds = state.creds;
        if (creds?.me) {
          phone = creds.me.id ? String(creds.me.id).split(':')[0].split('@')[0] : null;
          pushName = creds.me.name || null;
        }
      } catch (e) {}
      await persistStatus(userId, 'connected', {
        phone_number: phone,
        push_name: pushName,
        connected_at: new Date(),
      });
      console.log(`[WhatsApp ${userId}] Connected as ${pushName || phone || 'unknown'}`);
    }

    if (connection === 'close') {
      session.qr = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;

      if (session.sock) {
        try { session.sock.end(undefined); } catch (e) {}
        session.sock = null;
      }

      if (loggedOut) {
        clearAuthSession(userId);
        session.status = 'disconnected';
        await persistStatus(userId, 'disconnected', { last_error: 'logged_out' });
        console.log(`[WhatsApp ${userId}] Logged out — clear session, awaiting QR rescan`);
      } else {
        session.status = 'disconnected';
        await persistStatus(userId, 'disconnected', { last_error: `disconnect_code_${code}` });
        console.log(`[WhatsApp ${userId}] Disconnected, reconnecting in 5s...`);
        clearTimeout(session.reconnectTimer);
        session.reconnectTimer = setTimeout(() => connectWhatsApp(userId), 5000);
      }
    }
  });

  session.sock.ev.on('creds.update', saveCreds);
}

function clearAuthSession(userId) {
  for (const key of groupMetaCache.keys()) {
    if (key.startsWith(`${userId}:`)) groupMetaCache.delete(key);
  }
  try {
    const dir = getAuthDir(userId);
    for (const f of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, f), { recursive: true, force: true });
    }
    console.log(`[WhatsApp ${userId}] Auth session cleared`);
  } catch (e) {
    console.warn(`[WhatsApp ${userId}] Failed to clear auth session:`, e.message);
  }
}

async function disconnectWhatsApp(userId) {
  const session = getOrCreateSession(userId);
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
  if (session.sock) {
    try { await session.sock.logout(); } catch (e) {}
    session.sock = null;
  }
  clearAuthSession(userId);
  session.status = 'disconnected';
  session.qr = null;
  await persistStatus(userId, 'disconnected');
  console.log(`[WhatsApp ${userId}] Disconnected (manual)`);

  // Auto-reconnect to generate fresh QR
  setTimeout(() => connectWhatsApp(userId).catch(e =>
    console.error(`[WhatsApp ${userId}] Reconnect after disconnect failed:`, e.message)
  ), 1000);
}

function getWhatsAppState(userId) {
  const session = sessions.get(userId);
  if (!session) return { status: 'disconnected', qr: null };
  return { status: session.status, qr: session.qr };
}

async function sendWhatsApp(userId, jid, message, imagePaths) {
  const session = sessions.get(userId);
  if (!session || session.status !== 'connected' || !session.sock) {
    throw new Error(`WhatsApp not connected for user ${userId} (status: ${session?.status || 'disconnected'})`);
  }
  const normalized = normalizeJid(jid);
  const paths = imagePaths ? (Array.isArray(imagePaths) ? imagePaths : [imagePaths]) : [];
  const validPaths = paths.filter(p => fs.existsSync(p));

  if (validPaths.length === 0) {
    await session.sock.sendMessage(normalized, { text: message });
  } else if (validPaths.length === 1) {
    await session.sock.sendMessage(normalized, { image: { url: validPaths[0] }, caption: message });
  } else {
    for (let i = 0; i < validPaths.length; i++) {
      const caption = i === 0 ? message : '';
      await session.sock.sendMessage(normalized, { image: { url: validPaths[i] }, caption });
    }
  }
}

// Re-establish sessions for every user with saved credentials on disk.
// Baileys creds survive restarts, but the in-memory `sessions` Map does not —
// without this, scheduled WhatsApp sends fail until a user opens the QR page.
async function restoreSessions() {
  let dirs;
  try {
    dirs = fs.readdirSync(AUTH_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d+$/.test(d.name))
      .filter(d => fs.existsSync(path.join(AUTH_DIR, d.name, 'creds.json')));
  } catch (e) {
    return; // AUTH_DIR missing — nothing to restore
  }
  for (const d of dirs) {
    const userId = Number(d.name);
    try {
      await connectWhatsApp(userId);
      console.log(`[WhatsApp ${userId}] Session restore started`);
    } catch (e) {
      console.error(`[WhatsApp ${userId}] Session restore failed:`, e.message);
    }
  }
}

async function listGroups(userId) {
  const session = sessions.get(userId);
  if (!session || session.status !== 'connected' || !session.sock) {
    throw new Error(`WhatsApp not connected for user ${userId} (status: ${session?.status || 'disconnected'})`);
  }
  const groups = await session.sock.groupFetchAllParticipating();
  // Warm the send-path cache — this call already returns full metadata.
  const now = Date.now();
  for (const [jid, meta] of Object.entries(groups)) {
    groupMetaCache.set(`${userId}:${jid}`, { at: now, meta });
  }
  return Object.values(groups)
    .map(g => ({
      jid: g.id,
      subject: g.subject || g.id,
      participants: g.participants?.length || 0,
      announce: Boolean(g.announce),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
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

module.exports = { connectWhatsApp, disconnectWhatsApp, sendWhatsApp, getWhatsAppState, listGroups, restoreSessions };
