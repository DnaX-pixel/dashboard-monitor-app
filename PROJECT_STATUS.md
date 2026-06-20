# Dashboard Monitor App — Project Status & Handoff

> Full-stack web app: monitors URLs via scheduled screenshots + OCR, sends
> email/WhatsApp notifications only when content changes.

---

## Status: ALL PHASES COMPLETE + V2 FEATURES

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Core Backend — Express, SQLite, JWT auth, CRUD jobs+recipients | ✅ Done |
| 2 | Screenshot + OCR — Playwright capture, Ollama vision LLM (minicpm-v4.6), history API | ✅ Done |
| 3 | Notifications — Nodemailer email + Baileys WhatsApp, screenshot attachments | ✅ Done |
| 4 | Scheduler — node-cron per-job, change detection, next-run countdown | ✅ Done |
| 5 | Frontend — React+Vite, dark theme, Dashboard, JobForm+CropSelector, History, WhatsApp QR | ✅ Done |
| 6 | V2 Features — Multi-URL, Comparison View, Health Check, Crop Fullscreen, Schedule Alarm | ✅ Done |

---

## How to Run

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

App is at `http://localhost:5173`. Vite proxies `/api` and `/static` → port 3001.

### If backend fails with "database is locked"
`node-sqlite3-wasm` creates `data/dashboard.db.lock/` as a lock DIRECTORY.
Delete it before restarting:
```powershell
Remove-Item data\dashboard.db.lock -Recurse -Force
```

---

## File Structure

```
dashboard-monitor-app/
├── CLAUDE.md                    # Original spec / requirements
├── PROJECT_STATUS.md            # This file
├── data/                        # Auto-created at runtime
│   ├── dashboard.db             # SQLite database
│   ├── dashboard.db.lock/       # Lock dir (delete if stuck)
│   ├── screenshots/{jobId}/     # Cropped screenshots per job
│   └── previews/{userId}/       # Full-page preview screenshots
├── auth_info/                   # Baileys WhatsApp session (auto-created)
│
├── backend/
│   ├── .env                     # Environment variables (see below)
│   ├── package.json
│   └── src/
│       ├── index.js             # Express app entrypoint + startup hooks
│       ├── db/
│       │   └── database.js      # SQLite init + table schema
│       ├── middleware/
│       │   └── auth.js          # JWT verify middleware → req.user
│       ├── routes/
│       │   ├── auth.js          # POST /register, /login; GET /me
│       │   ├── jobs.js          # GET/POST/PUT/DELETE /api/jobs
│       │   ├── recipients.js    # CRUD /api/jobs/:jobId/recipients
│       │   ├── runs.js          # POST /api/jobs/:id/run + GET /history
│       │   ├── whatsapp.js      # GET /status, /qr; POST /connect
│       │   └── preview.js       # POST /api/preview (full-page screenshot)
│       ├── services/
│       │   ├── capture.js       # Playwright: captureAndCrop(), capturePreview()
│       │   ├── ocr.js           # Ollama vision LLM: extractText() via minicpm-v4.6
│       │   ├── email.js         # Nodemailer: sendEmail() — lazy init
│       │   ├── whatsapp.js      # Baileys singleton: connect/send/state
│       │   └── runner.js        # Core run logic: capture→OCR→compare→notify→record
│       └── scheduler/
│           └── index.js         # node-cron per-job tasks, initScheduler()
│
└── frontend/
    ├── vite.config.js           # Port 5173, proxy /api + /static → 3001
    ├── package.json
    └── src/
        ├── main.jsx             # React root
        ├── api.js               # apiFetch helper — auto Bearer token from localStorage
        ├── auth.jsx             # AuthContext: login(token,user) / logout()
        ├── App.jsx              # Router: PrivateRoute + NavBar layout
        ├── components/
        │   ├── NavBar.jsx       # Top nav with logout
        │   ├── CropSelector.jsx # Canvas drag-box for crop area (uses refs, not state)
        │   └── SchedulePicker.jsx # "Every N [unit] at HH:MM" → cron string
        └── pages/
            ├── Login.jsx        # Login + register tabs
            ├── Dashboard.jsx    # Job list cards + run/pause/delete actions
            ├── JobForm.jsx      # Create/edit job with preview + crop selector
            ├── JobHistory.jsx   # Table of run history with thumbnails
            └── WhatsApp.jsx     # QR code display + status polling
```

---

## API Endpoints

All `/api/*` routes require `Authorization: Bearer <jwt>` except auth routes.

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{name, email, password}` | Register new user |
| POST | `/api/auth/login` | `{email, password}` | Login → `{token, user}` |
| GET | `/api/auth/me` | — | Current user info |

### Jobs
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/jobs` | — | All jobs for current user |
| POST | `/api/jobs` | job fields | Create job |
| GET | `/api/jobs/:id` | — | Single job |
| PUT | `/api/jobs/:id` | partial fields | Update job (also reschedules cron) |
| DELETE | `/api/jobs/:id` | — | Delete job + history |

### Recipients
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/jobs/:jobId/recipients` | — | List recipients |
| POST | `/api/jobs/:jobId/recipients` | `{type, value}` | Add recipient |
| DELETE | `/api/jobs/:jobId/recipients/:id` | — | Remove recipient |

### Runs & History
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobs/:id/run` | Trigger immediate run (201 → history row) |
| GET | `/api/jobs/:id/history` | All run history for job |

### WhatsApp
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whatsapp/status` | any user | `{status}` — disconnected/awaiting_qr/connected |
| GET | `/api/whatsapp/qr` | admin only | `{status, qr}` — QR as data URL |
| POST | `/api/whatsapp/connect` | admin only | Trigger reconnect |

### Preview
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/preview` | `{target_url}` | Full-page screenshot → `{screenshot_url}` |

Static files served at `/static/*` → maps to `data/` directory.

---

## Environment Variables (`backend/.env`)

```env
PORT=3001
JWT_SECRET=dm-app-secret-xK9mP2vQ7nR4sL8wJ1bY6tF3hE5cA0

# Email — leave blank to skip email notifications
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

---

## Data Model

```
USER 1───M JOB 1───M RECIPIENT
            │
            1
            │
            M
         HISTORY
```

### Key fields
- **jobs.crop_x/y/width/height** — stored as % (0–100), NOT pixels. Converted to pixels at capture time using 1280×720 viewport.
- **jobs.status** — `active` | `paused`
- **jobs.notify_only_on_change** — 1 = only notify when OCR text differs from previous run
- **recipients.type** — `email` | `whatsapp`
- **recipients.value** — email address OR WhatsApp JID (`60123456789@s.whatsapp.net`)
- **history.delivery_status** — `sent` | `failed` | `pending`

---

## Tech Stack & Critical Gotchas

### SQLite: `node-sqlite3-wasm` (NOT `better-sqlite3`)
**Why:** Machine runs Node.js v24 on Windows without VS Build Tools. `better-sqlite3` requires native compilation via node-gyp which fails without VS.

**API differences from better-sqlite3:**
```js
// CORRECT — parameters MUST be an array
db.prepare('SELECT * FROM users WHERE user_id = ?').get([userId]);
db.prepare('INSERT INTO users ...').run([name, email, hash]);
db.prepare('SELECT * FROM jobs').all([]);  // empty array for no params

// WRONG — spread args don't work
db.prepare('...').get(userId);     // ❌
db.prepare('...').run(name, email); // ❌

// Use db.exec() instead of db.pragma()
db.exec('PRAGMA journal_mode = WAL');  // ✅
db.pragma('journal_mode = WAL');       // ❌ method doesn't exist
```

### WhatsApp: Baileys (`@whiskeysockets/baileys`)
- Session saved to `auth_info/` — keep this folder, don't delete
- 1 shared admin WhatsApp number for all users (not per-user)
- `is_admin=1` in users table → can view QR at `/api/whatsapp/qr`
- Auto-reconnects every 5s on disconnect
- To set admin: `UPDATE users SET is_admin=1 WHERE email='your@email.com';`

### Email: Nodemailer v9
- Lazy-initialized — only creates transporter if `SMTP_HOST` is set
- Throws "SMTP not configured" gracefully if env vars missing

### Screenshot: Playwright (Chromium)
- Headless, 1280×720 viewport
- Waits for `load` + 8s delay (for heavy JS dashboards like Power BI)
- Crop = `% / 100 * 1280` (or 720 for height)

### OCR: Ollama + minicpm-v4.6 (Vision LLM)
**Why:** Tesseract.js accuracy was poor on dense table data (dashboard screenshots).
Replaced with local vision LLM via Ollama for much better structured output.

**Setup:**
1. Install Ollama: https://ollama.com/download/windows
2. Pull model: `ollama pull minicpm-v4.6` (~1.6GB)
3. Ensure Ollama running (default port 11434)

**How it works:**
- `ocr.js` sends screenshot as base64 to Ollama `/api/generate` endpoint
- Model: `minicpm-v4.6` (configurable via `OLLAMA_VISION_MODEL` env var)
- Prompt instructs model to extract text preserving table structure (pipe-separated columns)
- Returns clean text with table layout intact

**Env vars (optional):**
- `OLLAMA_URL` - default `http://localhost:11434`
- `OLLAMA_VISION_MODEL` - default `minicpm-v4.6`

### Frontend
- CropSelector uses `useRef` for drag state to avoid stale closure issues
- `cropProp` in JobForm wrapped in `useMemo` to prevent unnecessary CropSelector re-renders
- JWT stored in `localStorage`, decoded client-side via `atob(token.split('.')[1])`

---

## Test Accounts (created during dev)

| Email | Password | Notes |
|-------|----------|-------|
| `test@example.com` | `password123` | Regular user |
| `admin@example.com` | `adminpass` | Set `is_admin=1` in DB for WhatsApp QR access |

---

## What's NOT in scope (this phase)

- Multi-tenant WhatsApp (each user their own number)
- 24/7 cloud hosting (local PC only)
- Admin panel / role hierarchy
- Mobile responsive design

---

## Potential Next Steps

1. **Configure email** — fill SMTP vars in `backend/.env`, test with Gmail SMTP
2. **Set admin** — run `UPDATE users SET is_admin=1 WHERE email='admin@example.com'` in SQLite
3. **Scan WhatsApp QR** — go to `http://localhost:5173/whatsapp` as admin, scan QR
4. **Create a real job** — test end-to-end with a real URL
5. **Frontend redesign** — UI is functional but minimal; could be redesigned
