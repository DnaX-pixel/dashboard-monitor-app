# Dashboard Monitor App — Startup Guide

Panduan untuk start backend + frontend + Ollama dari awal.

---

## Pilihan 1: Docker (Recommended — paling senang)

Satu command je untuk run semua — backend + frontend + Ollama dalam containers.

### Prerequisites

| Tool | Required | Check |
|------|----------|-------|
| Docker Desktop | ✅ | `docker --version` |
| Docker Compose | ✅ | `docker compose version` |

### Step 1: Configure environment

```bash
# Clone repo (jika belum)
git clone https://github.com/DnaX-pixel/dashboard-monitor-app.git
cd dashboard-monitor-app

# Copy env template
cp backend/.env.docker backend/.env

# Edit backend/.env — set JWT_SECRET dan SMTP credentials
notepad backend/.env   # Windows
```

### Step 2: Build & start semua services

```bash
docker compose up -d --build
```

Tunggu 5-10 minit untuk first build (download images + npm install + Playwright Chromium).

**Verify containers running:**
```bash
docker compose ps
```

Should show 3 services: `monitor-backend`, `monitor-frontend`, `monitor-ollama` — semua "Up".

### Step 3: Pull Ollama vision model (first time only)

```bash
docker exec monitor-ollama ollama pull minicpm-v4.6
```

Model size ~1.6GB, ambil masa beberapa minit.

### Step 4: Buka app

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **Ollama**: http://localhost:11434

Register akaun baru, set sebagai admin (untuk WhatsApp QR), scan QR, mula monitor.

### Docker commands

```bash
# View logs semua services
docker compose logs -f

# View logs specific service
docker compose logs -f backend
docker compose logs -f ollama

# Stop semua
docker compose down

# Restart service tertentu
docker compose restart backend

# Rebuild lepas code changes
docker compose up -d --build

# List running containers
docker compose ps

# Masuk shell dalam container
docker exec -it monitor-backend sh
docker exec -it monitor-ollama bash

# Pull Ollama model tambahan
docker exec monitor-ollama ollama pull <model-name>

# Delete semua (data, sessions, models)
docker compose down -v
```

### Services dalam docker-compose.yml

| Service | Port | Description |
|---------|------|-------------|
| `monitor-backend` | 3001 | Express API + Playwright + scheduler |
| `monitor-frontend` | 80 | React UI served by nginx |
| `monitor-ollama` | 11434 | Ollama vision OCR engine |

### Persistent data

Data disimpan dalam Docker volumes (kekal walaupun containers di-restart/di-delete):

| Volume | Contents |
|--------|----------|
| `backend-data` | SQLite DB, screenshots, OCR cache |
| `backend-auth` | WhatsApp Baileys session (QR linked devices) |
| `ollama-models` | Downloaded Ollama models |

### Troubleshooting Docker

**Container exit immediately:**
```bash
docker compose logs backend
# Check error message
```

**Port 80/3001/11434 already in use:**
```bash
# Windows — find process
netstat -ano | findstr :80
# Kill PID
taskkill /PID <pid> /F
```

**Ollama model pull stuck:**
```bash
docker compose restart ollama
docker exec monitor-ollama ollama pull minicpm-v4.6
```

**Rebuild from scratch (full reset):**
```bash
docker compose down -v
docker compose up -d --build
docker exec monitor-ollama ollama pull minicpm-v4.6
```

---

## Pilihan 2: Manual (tanpa Docker)

Run backend + frontend + Ollama secara manual dalam 3 terminals.

---

## Prerequisites

| Tool | Required | Check |
|------|----------|-------|
| Node.js v24+ | ✅ | `node --version` |
| Python 3.11+ | ✅ | `python --version` |
| Ollama | ✅ | `ollama --version` |
| Git | ✅ | `git --version` |

---

## Step 1: Start Ollama (OCR Engine)

Ollama berfungsi sebagai OCR engine menggunakan vision model `minicpm-v4.6`.

```bash
# Check Ollama installed
ollama --version

# Pull vision model (first time only, ~1.6GB)
ollama pull minicpm-v4.6

# Start Ollama server (runs in background, port 11434)
ollama serve
```

**Verify:**
```bash
# Check server running
curl http://localhost:11434/api/tags
# Should return JSON with model list

# Check model available
ollama list
# Should show: minicpm-v4.6
```

> **Note:** Jika Ollama tak start, buka Ollama Desktop app dulu, lepas tu run `ollama serve`.

---

## Step 2: Start Backend (Express API)

Backend berfungsi di port 3001. Handles: auth, jobs, scheduler, OCR, notifications.

```bash
# Navigate to backend folder
cd "C:\Users\Lenovo\Desktop\INTERN_TM TASK\dashboard-monitor-app\backend"

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

**Verify:**
```bash
# Check backend running
curl http://localhost:3001/api/health -H "Authorization: Bearer <token>"
# Should return JSON with health status
```

**If "database is locked" error:**
```bash
# Delete lock folder
Remove-Item "data\dashboard.db.lock" -Recurse -Force
# Then restart
npm run dev
```

---

## Step 3: Start Frontend (React + Vite)

Frontend berfungsi di port 5173. Proxies `/api` dan `/static` ke backend.

```bash
# Navigate to frontend folder (new terminal)
cd "C:\Users\Lenovo\Desktop\INTERN_TM TASK\dashboard-monitor-app\frontend"

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

**Verify:**
- Buka browser: `http://localhost:5173`
- Login page akan muncul

---

## Step 4: Initial Setup (first time only)

### 4a: Register user
1. Buka `http://localhost:5173`
2. Klik tab "Register"
3. Isi name, email, password
4. Login

### 4b: Set admin (for WhatsApp QR access)
Buka DB Browser for SQLite (`data/dashboard.db`), run SQL:
```sql
UPDATE users SET is_admin = 1 WHERE email = 'your@email.com';
```
Atau guna Node script:
```bash
cd backend
node -e "const db=require('./src/db/database'); db.prepare('UPDATE users SET is_admin=1 WHERE email=?').run(['your@email.com']); console.log('Done'); db.close();"
```
**Restart backend** lepas tu.

### 4c: Configure SMTP (email notifications)
Edit `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your@gmail.com
```
> Gmail App Password: https://myaccount.google.com/apppasswords

**Restart backend** lepas ubah `.env`.

### 4d: Scan WhatsApp QR
1. Login as admin
2. Pergi ke page "WhatsApp"
3. Scan QR dengan phone WhatsApp → Linked Devices → Link a Device
4. Status akan jadi "Connected"

---

## Step 5: Create a Monitoring Job

1. Klik "+ New Job"
2. Isi Job Name (cth: "TNB Status Monitor")
3. Isi Notification Subject (cth: "GR VERIFY Compliance Status")
4. Isi Target URL (cth: `https://example.com`)
5. Klik "🔍 Capture Screenshot" — tunggu 10-15s
6. Drag box pada preview untuk pilih crop area
7. (Optional) Klik "⛶ Fullscreen" untuk crop yang lebih jelas
8. Set Schedule (Interval atau Alarm mode)
9. Add Notification Recipients (email/WhatsApp)
10. Klik "Save Job"

### Multi-URL Mode (optional)
1. Enable "Multi-URL Monitoring" checkbox
2. Target URL field akan disabled
3. Add multiple URLs dengan label
4. Setiap URL ada CropSelector + Preview sendiri
5. Save — semua URLs akan screenshot + OCR dalam satu run

---

## Quick Start (3 terminals)

### Terminal 1 — Ollama
```bash
ollama serve
```

### Terminal 2 — Backend
```bash
cd "C:\Users\Lenovo\Desktop\INTERN_TM TASK\dashboard-monitor-app\backend"
npm run dev
```

### Terminal 3 — Frontend
```bash
cd "C:\Users\Lenovo\Desktop\INTERN_TM TASK\dashboard-monitor-app\frontend"
npm run dev
```

Buka: `http://localhost:5173`

---

## Troubleshooting

### Backend: "database is locked"
```bash
cd backend
Remove-Item data\dashboard.db.lock -Recurse -Force
npm run dev
```

### OCR: "Ollama not running"
```bash
ollama serve
# atau buka Ollama Desktop app
```

### OCR: "Model not found"
```bash
ollama pull minicpm-v4.6
```

### WhatsApp: "Cannot connect"
1. Check Ollama running: `http://localhost:11434`
2. Check backend running: `http://localhost:3001`
3. Check `auth_info/` folder wujud (session)
4. Scan QR semula di `/whatsapp` page

### Email: "SMTP not configured"
Isi `backend/.env` dengan SMTP details, restart backend.

### Preview: "Page.goto: Cannot navigate to invalid URL"
Pastikan URL betul (mesti `http://` atau `https://`), bukan copy-paste console error.

### Frontend: blank page
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables (`backend/.env`)

```env
PORT=3001
JWT_SECRET=dm-app-secret-xK9mP2vQ7nR4sL8wJ1bY6tF3hE5cA0

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your@gmail.com

# Ollama OCR (optional, defaults shown)
OLLAMA_URL=http://localhost:11434
OLLAMA_VISION_MODEL=minicpm-v4.6
```

---

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `test@example.com` | `password123` | Regular user |
| `admin@example.com` | `adminpass` | Admin (WhatsApp QR access) |

---

## Architecture

### Manual mode

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

### Docker mode

```
┌──────────────────────────────────────────────────┐
│              Docker Compose (monitor-net)         │
│                                                   │
│  ┌──────────────┐    ┌──────────────┐            │
│  │  frontend    │    │  backend     │            │
│  │  nginx:80    │───▶│  node:3001   │            │
│  │  (React)     │    │  + Playwright│            │
│  └──────────────┘    └──────┬───────┘            │
│                              │                    │
│                              ▼                    │
│                       ┌──────────────┐            │
│                       │  ollama      │            │
│                       │  :11434      │            │
│                       └──────────────┘            │
│                              │                    │
│                       ┌──────┴───────┐            │
│                       │  Volumes     │            │
│                       │  - backend-  │            │
│                       │    data      │            │
│                       │  - backend-  │            │
│                       │    auth      │            │
│                       │  - ollama-   │            │
│                       │    models    │            │
│                       └──────────────┘            │
└──────────────────────────────────────────────────┘
```

---

## Features Summary

| Feature | Description |
|---------|-------------|
| **Auth** | Register, login, JWT session |
| **Jobs** | CRUD monitoring jobs dengan custom crop area |
| **Schedule** | Interval mode (every X min/hours) atau Alarm mode (pilih hari + time) |
| **Multi-URL** | Satu job boleh monitor multiple URLs, setiap satu ada crop sendiri |
| **Screenshot** | Playwright headless, 1280x720 viewport, 8s delay untuk heavy JS |
| **Crop** | Drag box + Fullscreen modal mode untuk precision |
| **OCR** | Ollama minicpm-v4.6 vision LLM, output terstruktur |
| **Notifications** | Email (SMTP + multiple attachments) + WhatsApp (multiple images) |
| **Change Detection** | Banding OCR text, hanya notify bila berubah |
| **History** | Setiap run direkod, tunjuk screenshot + OCR + status |
| **Compare View** | Side-by-side screenshot + OCR text comparison |
| **Health Check** | Status semua services dalam satu page (DB, Ollama, SMTP, WhatsApp, etc) |
| **Dashboard** | Stats row, last run status, next run countdown timer |
| **Dark Theme** | Modern UI dengan glassmorphism, animations, gradient |
| **Real-time Clock** | Malaysia time di navbar, update setiap saat |