# 📊 Dashboard Monitor & Alert App

> Web app yang monitor dashboard/status page secara automatik: screenshot area
> tertentu pada URL, extract teks dengan OCR, banding dengan run sebelumnya, dan
> hantar notifikasi (Email + WhatsApp) hanya bila content berubah.

![Status](https://img.shields.io/badge/status-complete-brightgreen)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)
![OCR](https://img.shields.io/badge/OCR-Ollama%20%2B%20minicpm--v4.6-orange)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Auth** | Register, login, JWT session, multi-user |
| 📋 **Job Management** | CRUD monitoring jobs dengan custom crop area |
| ⏰ **Smart Schedule** | Interval mode (`every X min/hours`) atau Alarm mode (`weekdays at 08:00`) |
| 🌐 **Multi-URL Monitoring** | Satu job boleh monitor multiple URLs, setiap satu ada crop sendiri |
| 📸 **Screenshot** | Playwright headless, 1280×720 viewport, 8s delay untuk SPA berat (Power BI, etc) |
| ✂️ **Crop Tool** | Drag-and-drop + fullscreen modal mode untuk precision |
| 🤖 **AI OCR** | Ollama + minicpm-v4.6 vision LLM — output terstruktur, faham table layout |
| 📧 **Email Alerts** | Nodemailer SMTP + multiple image attachments |
| 📱 **WhatsApp Alerts** | Baileys + multiple images (1 nombor admin dikongsi) |
| 🔍 **Change Detection** | Banding OCR text, hanya notify bila berubah (anti-spam) |
| 📊 **History** | Setiap run direkod, tunjuk screenshot + OCR + delivery status |
| 🔄 **Compare View** | Side-by-side screenshot + OCR text comparison (visual diff) |
| ❤️ **Health Check** | Status semua services dalam satu page |
| 🎨 **Modern UI** | Dark theme, glassmorphism, gradient animations, Malaysia real-time clock |
| 📅 **Multi-Image** | Email & WhatsApp boleh hantar SEMUA screenshots untuk multi-URL jobs |

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Ollama      │
│  React+Vite │     │  Express API │     │  minicpm-v4.6 │
│  :5173      │     │  :3001       │     │  :11434       │
└─────────────┘     └──────┬───────┘     └───────────────┘
                           │
                    ┌──────┴───────┐
                    │   SQLite     │
                    │  dashboard.db│
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Playwright│ │Nodemailer│ │ Baileys  │
        │Screenshot│ │  Email   │ │WhatsApp  │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 🚀 Quick Start

Pastikan awak ada:
- Node.js v24+
- Python 3.11+ (optional, untuk advanced OCR)
- Ollama + vision model
- Git

### 1. Clone repo
```bash
git clone https://github.com/YOUR_USERNAME/dashboard-monitor-app.git
cd dashboard-monitor-app
```

### 2. Start Ollama (OCR engine)
```bash
ollama pull minicpm-v4.6   # first time only, ~1.6GB
ollama serve
```

### 3. Start Backend
```bash
cd backend
npm install
cp .env.example .env       # then edit with your SMTP credentials
npm run dev
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Buka browser
👉 **`http://localhost:5173`**

Register akaun baru, set admin (lihat `STARTUP_GUIDE.md`), dan mula monitor!

---

## 📂 Project Structure

```
dashboard-monitor-app/
├── CLAUDE.md                    # Original spec / requirements
├── PROJECT_STATUS.md            # Detailed project status & handoff
├── STARTUP_GUIDE.md             # Complete startup + troubleshooting guide
├── README.md                    # This file
├── .gitignore                   # Git ignore rules
│
├── backend/                     # Express API server (port 3001)
│   ├── .env.example            # Environment template
│   ├── package.json
│   └── src/
│       ├── index.js             # Entry point + startup hooks
│       ├── db/
│       │   └── database.js      # SQLite schema + migrations
│       ├── middleware/
│       │   └── auth.js          # JWT verify → req.user
│       ├── routes/
│       │   ├── auth.js          # /register, /login, /me
│       │   ├── jobs.js          # CRUD /api/jobs
│       │   ├── recipients.js    # CRUD recipients per job
│       │   ├── runs.js          # POST /run, GET /history
│       │   ├── jobItems.js      # Multi-URL items CRUD
│       │   ├── whatsapp.js      # QR + status + connect
│       │   ├── preview.js       # Full-page screenshot for crop selector
│       │   └── health.js        # System health check
│       ├── services/
│       │   ├── capture.js       # Playwright: captureAndCrop(), capturePreview()
│       │   ├── ocr.js           # Ollama vision LLM: extractText()
│       │   ├── email.js         # Nodemailer: sendEmail() + attachments
│       │   ├── whatsapp.js      # Baileys: connect/send/state
│       │   └── runner.js        # Core run: capture→OCR→compare→notify→record
│       └── scheduler/
│           └── index.js         # node-cron per-job tasks
│
└── frontend/                    # React + Vite (port 5173)
    ├── vite.config.js          # Proxies /api + /static → 3001
    ├── package.json
    └── src/
        ├── main.jsx             # React root
        ├── App.jsx              # Router + Layout
        ├── index.css            # All styles (dark theme)
        ├── api.js               # apiFetch helper
        ├── auth.jsx             # AuthContext
        ├── components/
        │   ├── NavBar.jsx       # Top nav with real-time MY clock
        │   ├── CropSelector.jsx # Drag box + Fullscreen modal
        │   ├── CroppedPreview.jsx # Show cropped result
        │   └── SchedulePicker.jsx # Interval/Alarm mode
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx     # Job cards + stats + next-run timer
            ├── JobForm.jsx       # Create/edit + CropSelector + Multi-URL
            ├── JobHistory.jsx    # Table of runs with thumbnails
            ├── CompareView.jsx   # Side-by-side comparison
            ├── WhatsApp.jsx      # QR code + status
            └── HealthCheck.jsx   # System health dashboard
```

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- SQLite (via `node-sqlite3-wasm`)
- Playwright (headless Chromium screenshots)
- Tesseract.js (fallback OCR)
- Ollama + minicpm-v4.6 (vision LLM OCR)
- node-cron (scheduler)
- Nodemailer (email)
- Baileys (WhatsApp Web)
- JWT (auth)
- cron-parser (next-run calculation)

**Frontend:**
- React 18 + Vite
- React Router DOM
- Modern CSS (dark theme, glassmorphism, animations)
- Canvas API (crop selector + cropped preview)

---

## 📦 Modules Overview

| Module | Description | Status |
|--------|-------------|--------|
| M1 — Auth & User | Pendaftaran, login, sesi | ✅ |
| M2 — Job Management | CRUD monitor job (URL, crop area, schedule, recipients) | ✅ |
| M3 — Capture & OCR | Screenshot engine + extract teks | ✅ |
| M4 — Scheduler | Cron trigger & change detection | ✅ |
| M5 — Email Service | Hantar emel via SMTP | ✅ |
| M6 — WhatsApp Service | Hantar mesej via Baileys | ✅ |
| M7 — History & Log | Rekod setiap run & status penghantaran | ✅ |
| M8 — Dashboard UI | Frontend: senarai job, crop tool, history view | ✅ |
| **M9 — Multi-URL** | Satu job monitor banyak URL | ✅ V2 |
| **M10 — Notification Subject** | Custom subject per job (user-defined) | ✅ V2 |
| **M11 — Schedule Alarm Mode** | Pilih hari + time macam phone alarm | ✅ V2 |
| **M12 — Compare View** | Side-by-side screenshot + OCR diff | ✅ V2 |
| **M13 — Health Check** | Status semua services | ✅ V2 |
| **M14 — Real-time Clock** | Malaysia time di navbar | ✅ V2 |
| **M15 — Cropped Preview** | Lihat hasil crop sebenar selepas drag | ✅ V2 |
| **M16 — Crop Fullscreen** | Modal popup untuk crop precision | ✅ V2 |
| **M17 — Next-Run Timer** | Countdown bila job akan run lagi | ✅ V2 |
| **M18 — Multi-Image Notify** | Hantar SEMUA screenshots (bukan 1) | ✅ V2 |

---

## 📝 License

MIT License — free to use, modify, distribute.

---

## 📚 Documentation

- **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)** — Complete setup + troubleshooting
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — Detailed project status, handoff notes, technical details
- **[CLAUDE.md](CLAUDE.md)** — Original specification (Malay)
