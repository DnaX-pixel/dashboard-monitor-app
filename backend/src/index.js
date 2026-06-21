require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve screenshots for frontend thumbnails
app.use('/static', express.static(path.join(__dirname, '../../data')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/jobs',      require('./routes/jobs'));
app.use('/api/jobs',      require('./routes/recipients'));
app.use('/api/jobs',      require('./routes/runs'));
app.use('/api/jobs',      require('./routes/jobItems'));
app.use('/api/whatsapp',  require('./routes/whatsapp'));
app.use('/api/preview',   require('./routes/preview'));
app.use('/api/health',    require('./routes/health'));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
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

    // Auto-connect WhatsApp
    const { connectWhatsApp } = require('./services/whatsapp');
    connectWhatsApp().catch(err => console.error('[WhatsApp] Startup connect failed:', err.message));
  });
}

start().catch(err => {
  console.error('[Startup] Fatal error:', err.message);
  process.exit(1);
});
