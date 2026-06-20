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
app.use('/api/health',     require('./routes/health'));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // Start cron scheduler for all active jobs
  const { initScheduler } = require('./scheduler');
  initScheduler();

  // Auto-connect WhatsApp (uses saved session if available)
  const { connectWhatsApp } = require('./services/whatsapp');
  connectWhatsApp().catch(err => console.error('[WhatsApp] Startup connect failed:', err.message));
});
