require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
// Trust the nginx reverse proxy (1 hop) so req.ip and X-Forwarded-For
// reflect the real client IP — needed for rate limiting + login history.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Serve screenshots for frontend thumbnails
app.use('/static', express.static(process.env.DATA_DIR || path.join(__dirname, '../../data')));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/jobs',          require('./routes/jobs'));
app.use('/api/jobs',          require('./routes/recipients'));
app.use('/api/jobs',          require('./routes/runs'));
app.use('/api/jobs',          require('./routes/jobItems'));
app.use('/api/whatsapp',      require('./routes/whatsapp'));
app.use('/api/email',         require('./routes/emailSettings'));
app.use('/api/email-presets', require('./routes/emailPresets'));
app.use('/api/preview',       require('./routes/preview'));
app.use('/api/health',        require('./routes/health'));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Safety net: routes that don't wrap their async handlers can still leak a
// rejected promise, which Node 22 escalates to an uncaughtException and exits
// on — taking the cron scheduler and the Baileys session down with it. Log and
// stay alive instead; the offending request still hangs, so the log matters.
process.on('unhandledRejection', reason => {
  console.error('[Fatal-guard] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', err => {
  console.error('[Fatal-guard] Uncaught exception:', err);
});

const PORT = process.env.PORT || 3001;

async function start() {
  // Init MySQL schema (create tables if not exist)
  const { initSchema } = require('./db/database');
  await initSchema();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);

    // Start cron scheduler
    const { initScheduler } = require('./scheduler');
    initScheduler().catch(err => console.error('[Scheduler] Init failed:', err.message));

    // WhatsApp is per-user: restore saved sessions, then lazy connect for the rest
    console.log('[WhatsApp] Multi-tenant mode — restoring saved sessions');
    const { restoreSessions } = require('./services/whatsapp');
    restoreSessions().catch(err => console.error('[WhatsApp] Session restore failed:', err.message));
  });
}

start().catch(err => {
  console.error('[Startup] Fatal error:', err.message);
  process.exit(1);
});
