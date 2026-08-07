# Dashboard Monitor & Alert App — Full Documentation

> Dokumentasi lengkap projek: dari konsep asal, arkitektur, database, API,
> services, frontend, sampai deployment. Dokumen ini adalah rujukan tunggal
> ("single source of truth") untuk semua aspek sistem — ditulis berdasarkan
> kod sumber sebenar (bukan hanya spec asal).

**Versi kod dianalisa:** `main` branch, commit `a8388d5` — "Fix frontend not
refreshing — nginx cache headers for index.html"

---

## Table of Contents

1. [Ringkasan Projek](#1-ringkasan-projek)
2. [Evolusi Projek — Dari Spec ke Implementasi](#2-evolusi-projek--dari-spec-ke-implementasi)
3. [Tech Stack](#3-tech-stack)
4. [Arkitektur Sistem](#4-arkitektur-sistem)
5. [Struktur Fail Projek](#5-struktur-fail-projek)
6. [Data Model / Database Schema](#6-data-model--database-schema)
7. [Backend — Modules & Services](#7-backend--modules--services)
8. [API Reference Lengkap](#8-api-reference-lengkap)
9. [Data Flow — Bagaimana Sistem Berfungsi](#9-data-flow--bagaimana-sistem-berfungsi)
10. [Scheduler & Cron Logic](#10-scheduler--cron-logic)
11. [Frontend — Struktur & Pages](#11-frontend--struktur--pages)
12. [Design System](#12-design-system)
13. [Keselamatan (Security)](#13-keselamatan-security)
14. [Environment Variables](#14-environment-variables)
15. [Setup & Installation](#15-setup--installation)
16. [Docker Deployment](#16-docker-deployment)
17. [Troubleshooting](#17-troubleshooting)
18. [Known Gotchas / Technical Notes](#18-known-gotchas--technical-notes)
19. [Skop & Batasan Projek](#19-skop--batasan-projek)
20. [Sejarah Perkembangan (Git History)](#20-sejarah-perkembangan-git-history)
21. [Appendix](#21-appendix)

---

## 1. Ringkasan Projek

**Dashboard Monitor & Alert App** ialah web app yang memantau dashboard/status
page secara automatik. Ia mengambil screenshot kawasan tertentu pada sesebuah
URL, extract teks dengan OCR (AI vision model), membandingkan hasil dengan
run sebelumnya, dan menghantar notifikasi (Email + WhatsApp) mengikut jadual —
tetapi hanya bila data berubah (untuk elak spam notification).

**Masalah yang diselesaikan:** Team selalunya perlu manually refresh
dashboard/status page berulang kali untuk detect perubahan data. Proses ini
memakan masa dan mudah tercicir. Sistem ini automatikkan proses tersebut
sepenuhnya.

**Cara ia berfungsi (ringkas):**
```
Scheduler trigger → Screenshot + Crop → OCR extract text → Compare dgn run lepas
→ Berubah? → Hantar Email/WhatsApp    → Sama? → Log sahaja (no spam)
```

---

## 2. Evolusi Projek — Dari Spec ke Implementasi

Dokumen asal (`CLAUDE.md`) menggariskan reka bentuk awal projek. Semasa
pembangunan, beberapa keputusan senibina berubah berdasarkan keperluan
praktikal. **Bahagian ini penting** kerana beberapa aspek dalam `CLAUDE.md`
sudah **tidak lagi mencerminkan implementasi sebenar**.

| Aspek | Spec Asal (`CLAUDE.md`) | Implementasi Sebenar (Kod) |
|-------|--------------------------|------------------------------|
| **Database** | SQLite | **MySQL** (`mysql2`), migrated kerana perlu volume Docker + concurrent access yang lebih stabil |
| **WhatsApp** | 1 nombor admin dikongsi semua user | **Multi-tenant** — setiap user connect WhatsApp sendiri (QR sendiri), session disimpan per `user_id` dalam `auth_info/{user_id}/` |
| **Email/SMTP** | 1 SMTP config global (`.env`) | **Multi-tenant** — setiap user configure SMTP sendiri melalui halaman "Email Settings" (`user_smtp` table) |
| **OCR Engine** | Tesseract.js | **Ollama + minicpm-v4.6** (vision LLM) — Tesseract punya ketepatan lemah untuk data table yang padat |
| **`is_admin` flag** | Penanda "siapa pegang sesi WhatsApp" | Kekal wujud dalam schema tapi sudah **tidak relevan** untuk WhatsApp sejak jadi multi-tenant; kini sekadar label role (Admin/User) di halaman Profile |
| **Auth** | Asas (register/login) | **Lebih lengkap**: email verification, forgot/reset password, account lockout selepas 5 percubaan gagal, rate limiting, login history log |
| **Job monitoring** | 1 URL per job | **Multi-URL per job** — 1 job boleh monitor beberapa URL sekaligus (`job_items` table), setiap satu ada crop area sendiri |
| **UI** | Ringkas/minimal | **Redesign penuh** — dark premium SaaS theme (Obsidian Flux design system), Tailwind CSS v4 |
| **Hosting** | Lokal PC sahaja | Kod kini menyokong **Docker Compose + VPS deployment** (`APP_BASE_URL`, nginx reverse proxy) — walaupun运 lokal juga masih disokong |

**Kesimpulan:** Modul teras (M1–M8) dalam spec asal kekal releven secara
konsep, tetapi pelaksanaan sudah berkembang jadi sistem **multi-tenant penuh**
(setiap user ada WhatsApp + SMTP sendiri), bukan lagi "1 admin WhatsApp
dikongsi semua user" seperti dinyatakan dalam skop asal.

---

## 3. Tech Stack

### Backend
| Komponen | Teknologi | Versi | Catatan |
|----------|-----------|-------|---------|
| Runtime | Node.js | v22/24 | |
| Framework | Express | ^4.19.2 | |
| Database | MySQL | 8.4 (Docker) | via `mysql2/promise` |
| Screenshot | Playwright (Chromium) | ^1.44.0 | headless, 1280×720 |
| OCR | Ollama + `minicpm-v4.6` | — | vision LLM via HTTP API |
| Scheduler | node-cron | ^3.0.3 | |
| Cron parsing | cron-parser | ^5.5.0 | untuk next-run calculation |
| Email | Nodemailer | ^9.0.1 | per-user SMTP |
| WhatsApp | @whiskeysockets/baileys | ^6.7.9 | per-user session |
| Auth | jsonwebtoken + bcryptjs | ^9.0.2 / ^2.4.3 | JWT 7 hari, bcrypt cost 10 |
| Rate limiting | express-rate-limit | ^8.5.2 | |
| QR generation | qrcode | ^1.5.3 | |

### Frontend
| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Framework | React | ^18.3.1 |
| Build tool | Vite | ^5.2.11 |
| Routing | react-router-dom | ^6.23.1 |
| Styling | Tailwind CSS | ^4.3.1 (via `@tailwindcss/vite`) |
| Icons | Material Symbols Outlined | Google Fonts CDN |
| Fonts | Plus Jakarta Sans, DM Sans, JetBrains Mono | Google Fonts CDN |

### Infrastructure (Docker)
| Servis | Image | Port |
|--------|-------|------|
| MySQL | `mysql:8.4` | 3306 |
| phpMyAdmin | `phpmyadmin:latest` | 8181 |
| Backend | custom (`node:22-slim`) | 3001 |
| Ollama | `ollama/ollama:latest` | 11434 |
| Frontend | custom (nginx + built React) | 80 |

---

## 4. Arkitektur Sistem

### Mode Manual (Development)
```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Ollama      │
│  React+Vite │     │  Express API │     │  minicpm-v4.6 │
│  :5173      │     │  :3001       │     │  :11434       │
└─────────────┘     └──────┬───────┘     └───────────────┘
                           │
                    ┌──────┴───────┐
                    │   MySQL DB   │
                    │dashboard_    │
                    │monitor       │
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Playwright│ │Nodemailer│ │ Baileys  │
        │Screenshot│ │  Email   │ │WhatsApp  │
        │(per job) │ │(per user)│ │(per user)│
        └──────────┘ └──────────┘ └──────────┘
```

### Mode Docker (Production/VPS)
```
┌──────────────────────────────────────────────────────────┐
│                Docker Compose (monitor-net)               │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │  frontend    │───▶│  backend     │───▶│  ollama     │ │
│  │  nginx :80   │    │  node :3001  │    │  :11434     │ │
│  │  (React SPA) │    │  + Playwright│    └─────────────┘ │
│  └──────────────┘    └──────┬───────┘                     │
│                              │                             │
│                       ┌──────▼───────┐    ┌─────────────┐ │
│                       │  mysql :3306 │◀───│ phpmyadmin  │ │
│                       └──────────────┘    │   :8181     │ │
│                                            └─────────────┘ │
│  Volumes: mysql-data · backend-data · backend-auth ·      │
│           ollama-models                                    │
└──────────────────────────────────────────────────────────┘
```

nginx (`frontend/nginx.conf`) berfungsi sebagai reverse proxy:
- `/` → serve React SPA (dengan `try_files` fallback untuk client-side routing)
- `/assets/` → cache selama-lamanya (hashed filenames dari Vite build)
- `/index.html` → **tidak pernah** di-cache (elak stale JS/CSS bundle)
- `/api/` → proxy ke `backend:3001`
- `/static/` → proxy ke `backend:3001` (untuk serve screenshot images)

---

## 5. Struktur Fail Projek

```
dashboard-monitor-app/
├── CLAUDE.md                    # Spec/requirement asal (Bahasa Melayu)
├── DOCUMENTATION.md              # Dokumen ini
├── README.md                     # Quick overview + quickstart
├── PROJECT_STATUS.md             # Status pembangunan + handoff notes
├── STARTUP_GUIDE.md              # Panduan startup terperinci
├── FRONTEND_DESIGN_SPEC.md       # Spec design system lengkap (untuk Stitch.ai)
├── PRESENTATION.md                # Slide deck notes untuk presentation
├── docker-compose.yml            # Orkestrasi 5 services
├── Dockerfile.backend            # Build image backend (root context)
├── Dockerfile.frontend           # Build image frontend (multi-stage, nginx)
├── data/                         # Runtime data (auto-created)
│   ├── dashboard.db(.lock)       # Fail legasi SQLite (tidak lagi dipakai)
│   ├── screenshots/{jobId}/      # Screenshot hasil crop per job
│   └── previews/{userId}/        # Full-page preview screenshot per user
├── auth_info/{userId}/           # Baileys WhatsApp session per user
│
├── backend/
│   ├── .env / .env.example / .env.docker
│   ├── package.json
│   └── src/
│       ├── index.js              # Entry point Express
│       ├── db/
│       │   ├── database.js       # MySQL pool + initSchema() + query helpers
│       │   ├── auth.js           # Login lockout, token gen, login history
│       │   └── authMailer.js     # Email verifikasi/reset password (per-user SMTP)
│       ├── middleware/
│       │   └── auth.js           # JWT verify → req.user
│       ├── routes/
│       │   ├── auth.js           # Register, login, verify, reset, profile
│       │   ├── jobs.js           # CRUD job
│       │   ├── jobItems.js       # CRUD multi-URL items
│       │   ├── recipients.js     # CRUD recipient (email/whatsapp/whatsapp_group)
│       │   ├── runs.js           # Manual run trigger + history
│       │   ├── whatsapp.js       # Status/QR/connect/disconnect (per user)
│       │   ├── emailSettings.js  # SMTP config CRUD + verify (per user)
│       │   ├── preview.js        # Full-page screenshot untuk crop tool
│       │   └── health.js         # System health check
│       ├── services/
│       │   ├── capture.js        # Playwright: captureAndCrop(), capturePreview()
│       │   ├── ocr.js            # Ollama vision LLM: extractText()
│       │   ├── email.js          # Nodemailer per-user, dgn cache
│       │   ├── whatsapp.js       # Baileys per-user session manager
│       │   └── runner.js         # Core logic: capture→OCR→compare→notify→log
│       └── scheduler/
│           └── index.js          # node-cron per job + next-run calculator
│
└── frontend/
    ├── vite.config.mjs           # Port 5173, proxy /api + /static → 3001
    ├── nginx.conf                # Config nginx untuk production
    ├── index.html
    └── src/
        ├── main.jsx               # React root
        ├── App.jsx                # Router + page-title mapping
        ├── api.js                 # apiFetch helper (auto Bearer token)
        ├── auth.jsx               # AuthContext (login/logout, decode JWT)
        ├── index.css              # Tailwind v4 theme tokens (Obsidian Flux)
        ├── components/
        │   ├── AppShell.jsx       # Sidebar + topbar layout, WA status poll, clock
        │   ├── CropSelector.jsx   # Canvas drag-box crop tool + fullscreen mode
        │   ├── CroppedPreview.jsx # Render hasil crop sebenar dari % koordinat
        │   └── SchedulePicker.jsx # UI "Every X" / "Alarm" → cron string
        └── pages/
            ├── Login.jsx           # Login/Register split-screen
            ├── ForgotPassword.jsx
            ├── ResetPassword.jsx
            ├── VerifyEmail.jsx
            ├── Dashboard.jsx       # Senarai job + stats + search/filter
            ├── JobForm.jsx         # Create/edit job + crop tool + multi-URL
            ├── JobHistory.jsx      # Table sejarah run per job
            ├── CompareView.jsx     # Side-by-side compare 2 run
            ├── WhatsApp.jsx        # QR + status per user
            ├── EmailSettings.jsx   # SMTP config per user
            ├── HealthCheck.jsx     # 7 system checks
            └── Profile.jsx         # Account info, password, login history

Catatan: terdapat folder duplikat lama
`dashboard-monitor-app/dashboard-monitor-app/` yang menyimpan versi kod
SEBELUM migrasi ke MySQL + multi-tenant (guna SQLite, WhatsApp single-admin).
Folder ini adalah salinan legasi/backup — bukan kod aktif. Kod aktif berada
di root `backend/` dan `frontend/`.
```

---

## 6. Data Model / Database Schema

Database: **MySQL** (`dashboard_monitor`), schema dibuat secara idempotent
oleh `initSchema()` semasa startup backend (`CREATE TABLE IF NOT EXISTS` +
`ALTER TABLE ... ADD COLUMN` dengan try/catch `ER_DUP_FIELDNAME`).

### ERD Ringkas
```
USER 1───M JOB 1───M RECIPIENT
 │          │
 │          1───M JOB_ITEM (multi-URL)
 │          │
 │          1───M HISTORY
 │
 ├──1───1 USER_SMTP           (SMTP config sendiri)
 ├──1───1 WHATSAPP_SESSIONS   (status sesi WA sendiri)
 ├──1───M EMAIL_VERIFICATIONS
 ├──1───M PASSWORD_RESETS
 └──1───M LOGIN_HISTORY
```

### Table: `users`
| Field | Jenis | Keterangan |
|---|---|---|
| user_id | INT AUTO_INCREMENT PK | |
| name | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt cost 10 |
| is_admin | TINYINT(1) DEFAULT 0 | label role (bukan permission — legasi dari spec asal) |
| email_verified | TINYINT(1) DEFAULT 0 | |
| failed_attempts | INT DEFAULT 0 | untuk account lockout |
| locked_until | DATETIME NULL | auto-reset selepas 15 minit |
| last_login_at | DATETIME NULL | |
| last_login_ip | VARCHAR(45) NULL | |
| created_at | DATETIME | |

### Table: `email_verifications`
| Field | Jenis | Keterangan |
|---|---|---|
| token | CHAR(64) PK | random hex 32 bytes |
| user_id | INT FK → users | |
| expires_at | DATETIME | TTL 24 jam |
| used_at | DATETIME NULL | |

### Table: `password_resets`
| Field | Jenis | Keterangan |
|---|---|---|
| token | CHAR(64) PK | |
| user_id | INT FK → users | |
| expires_at | DATETIME | TTL 30 minit |
| used_at | DATETIME NULL | |

### Table: `login_history`
| Field | Jenis | Keterangan |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| user_id | INT FK → users (nullable) | |
| email | VARCHAR(150) | |
| success | TINYINT(1) | |
| ip | VARCHAR(45) | disanitize dari IPv6-mapped IPv4 |
| user_agent | VARCHAR(500) | |
| created_at | DATETIME | index (user_id, created_at) |

### Table: `jobs`
| Field | Jenis | Keterangan |
|---|---|---|
| job_id | INT AUTO_INCREMENT PK | |
| user_id | INT FK → users | |
| job_name | VARCHAR(100) | |
| target_url | TEXT | kosong jika multi-URL mode |
| crop_x/y/width/height | DOUBLE | **peratusan (0–100)**, bukan pixel |
| schedule_cron | VARCHAR(50) | standard 5-field cron |
| notify_only_on_change | TINYINT(1) DEFAULT 1 | anti-spam flag |
| notification_subject | VARCHAR(200) | custom subject (jika kosong → guna job_name) |
| status | ENUM('active','paused') | |
| created_at | DATETIME | |

### Table: `job_items` (Multi-URL support)
| Field | Jenis | Keterangan |
|---|---|---|
| item_id | INT AUTO_INCREMENT PK | |
| job_id | INT FK → jobs (CASCADE) | |
| label | VARCHAR(100) | |
| target_url | TEXT | |
| crop_x/y/width/height | DOUBLE | peratusan |
| sort_order | INT | urutan paparan/eksekusi |

> Jika job ada `job_items`, runner akan capture **semua** URL dalam item
> tersebut dan gabungkan hasil OCR jadi satu notification (bukan guna
> `jobs.target_url`/`crop_*` terus).

### Table: `recipients`
| Field | Jenis | Keterangan |
|---|---|---|
| recipient_id | INT AUTO_INCREMENT PK | |
| job_id | INT FK → jobs (CASCADE) | |
| type | ENUM('email','whatsapp','whatsapp_group') | |
| value | VARCHAR(150) | email address, JID peribadi (`60123456789@s.whatsapp.net`), atau JID group (`120363...@g.us`) |
| label | VARCHAR(150) NULL | Nama paparan (nama group WhatsApp) — supaya UI tak tunjuk JID mentah |

### Table: `history`
| Field | Jenis | Keterangan |
|---|---|---|
| history_id | INT AUTO_INCREMENT PK | |
| job_id | INT FK → jobs (CASCADE) | |
| run_at | DATETIME | |
| screenshot_path | TEXT | path relatif dari `data/` (URL pertama jika multi) |
| ocr_text | TEXT | gabungan semua item jika multi-URL |
| changed_flag | TINYINT(1) | 1 jika berbeza dari run terakhir |
| delivery_status | ENUM('sent','failed','pending') | |
| error_message | TEXT | |

### Table: `user_smtp` (per-user SMTP config)
| Field | Jenis | Keterangan |
|---|---|---|
| user_id | INT PK, FK → users | 1-to-1 |
| smtp_host / smtp_port / smtp_user / smtp_pass / smtp_from | | |
| use_tls | TINYINT(1) DEFAULT 1 | |
| is_verified | TINYINT(1) DEFAULT 0 | set selepas `POST /api/email/verify` berjaya |
| last_error | TEXT | |
| updated_at | DATETIME ON UPDATE | |

### Table: `whatsapp_sessions` (per-user status persist)
| Field | Jenis | Keterangan |
|---|---|---|
| user_id | INT PK, FK → users | |
| status | ENUM('disconnected','awaiting_qr','connected') | |
| phone_number / push_name | VARCHAR | dari Baileys creds |
| connected_at | DATETIME | |
| last_error | TEXT | |

---

## 7. Backend — Modules & Services

Rujukan silang dengan modul asal M1–M8 dari `CLAUDE.md`:

| Modul Asal | Implementasi Fail | Status |
|---|---|---|
| M1 — Auth & User | `routes/auth.js`, `db/auth.js`, `db/authMailer.js`, `middleware/auth.js` | ✅ Diperluas (verifikasi email, reset password, lockout) |
| M2 — Job Management | `routes/jobs.js`, `routes/jobItems.js`, `routes/recipients.js` | ✅ Diperluas (multi-URL) |
| M3 — Capture & OCR | `services/capture.js`, `services/ocr.js` | ✅ OCR diganti Ollama vision LLM |
| M4 — Scheduler | `scheduler/index.js`, `services/runner.js` | ✅ |
| M5 — Email Service | `services/email.js`, `routes/emailSettings.js` | ✅ Jadi multi-tenant (per user) |
| M6 — WhatsApp Service | `services/whatsapp.js`, `routes/whatsapp.js` | ✅ Jadi multi-tenant (per user) |
| M7 — History & Log | `routes/runs.js` (bahagian history) | ✅ |
| M8 — Dashboard UI | seluruh `frontend/src/` | ✅ Redesign penuh |

### 7.1 `services/capture.js` — Screenshot Engine

```js
captureAndCrop(jobId, targetUrl, cropX, cropY, cropWidth, cropHeight)
capturePreview(userId, targetUrl)
```

- Guna **Playwright Chromium**, headless, viewport tetap `1280×720`.
- `page.goto(url, { waitUntil: 'load', timeout: 30000 })` + `waitForTimeout(8000)`
  — delay 8 saat sengaja untuk bagi masa SPA berat (contoh: Power BI embed)
  selesai render sebelum screenshot diambil.
- Crop dikira: `pixel = (percent / 100) * viewport_dimension`.
- Screenshot disimpan di `data/screenshots/{jobId}/{ISO-timestamp}.png`.
- Preview (untuk crop tool UI) disimpan di `data/previews/{userId}/preview.png`
  (overwrite setiap kali, satu fail per user).

### 7.2 `services/ocr.js` — OCR via Ollama Vision LLM

- Model lalai: `minicpm-v4.6`, boleh override via `OLLAMA_VISION_MODEL`.
- Kirim screenshot sebagai base64 ke endpoint `POST {OLLAMA_URL}/api/generate`.
- Prompt (`OCR_PROMPT`) arahkan model:
  - output plain text sahaja, tiada komentari
  - kekalkan struktur table (satu baris satu row, kolum dipisah `" | "`)
  - baca nombor/tarikh/project ID tepat
  - tulis `[unclear]` jika teks tak jelas
  - abaikan elemen dekoratif (ikon, status dot)
- `options: { temperature: 0.1, num_predict: 2048 }` — temperature rendah untuk
  konsistensi output.
- Health check dulu (`GET /api/tags`) sebelum extract — throw error mesra
  jika Ollama tidak jalan.

### 7.3 `services/email.js` — Nodemailer (Multi-Tenant)

- Setiap user ada config SMTP sendiri dalam `user_smtp`.
- Transporter di-cache dalam `Map<userId, {transporter, expiresAt}>` dengan
  TTL 5 minit — elak buat transporter baru setiap kali hantar email.
- `secure: true` auto jika port `465`; selain itu guna STARTTLS.
- `sendEmail(userId, to, subject, text, attachments)` — attachments boleh
  array (multi-URL job) atau single path.
- `verifyUserSmtp(userId)` — test `transporter.verify()`, invalidate cache
  jika gagal.

### 7.4 `services/whatsapp.js` — Baileys (Multi-Tenant)

- `sessions: Map<userId, {sock, status, qr, reconnectTimer}>` — satu socket
  Baileys per user.
- Auth session disimpan di `auth_info/{userId}/` (via `useMultiFileAuthState`).
- Status lifecycle: `disconnected → connecting → awaiting_qr → connected`.
- QR di-convert jadi data URL (`qrcode` package) untuk dipaparkan di frontend.
- Auto-reconnect 5 saat selepas disconnect **kecuali** jika sebab logout
  (`DisconnectReason.loggedOut`) — dalam kes itu, auth session dipadam dan
  perlu scan QR baru.
- `sendWhatsApp(userId, jid, message, imagePaths)`:
  - tiada imej → hantar teks sahaja
  - 1 imej → hantar image + caption
  - >1 imej → hantar setiap imej berasingan, caption hanya pada imej pertama
- `normalizeJid()` — auto-format nombor Malaysia (`0123...` → `60123...`,
  tambah `@s.whatsapp.net` jika belum ada `@`). Nilai yang sudah ada `@`
  dibiar apa adanya — sebab itu JID group (`...@g.us`) terus lalu tanpa diubah.
- `listGroups(userId)` — `groupFetchAllParticipating()` → senarai group yang
  akaun tersebut sertai (`jid`, `subject`, `participants`, `announce`).
  Sekali gus memanaskan cache metadata group.
- `restoreSessions()` — dipanggil masa startup. Creds Baileys kekal atas disk
  tapi Map `sessions` dalam memori kosong selepas restart; tanpa ini semua
  hantaran WhatsApp berjadual gagal sampai user buka page QR secara manual.
- Cache metadata group (TTL 5 minit) — Baileys fetch metadata group pada
  **setiap** send kalau `cachedGroupMetadata` tak diberi. Job yang hantar
  banyak screenshot ke beberapa group boleh kena rate limit tanpa cache ini.

### 7.5 `services/runner.js` — Core Orchestration

Fungsi utama: `runJob(jobId)`.

1. Ambil job (mesti `status = 'active'`, jika tidak return `null`).
2. Ambil `ocr_text` dari history terkini (untuk comparison).
3. Ambil `job_items` (jika ada → multi-URL mode).
4. **Single-URL mode**: capture + OCR sekali guna `job.target_url` & crop job.
5. **Multi-URL mode**: loop setiap `job_items`, capture + OCR setiap satu,
   gabung hasil dengan header `=== {label} ===` per section.
6. `changedFlag = (!lastHistory || lastHistory.ocr_text !== ocrText) ? 1 : 0`.
7. Jika capture/OCR gagal → `deliveryStatus = 'failed'`, `errorMessage` diisi,
   **notifikasi di-skip**.
8. `shouldSend = !errorMessage && (changedFlag || !job.notify_only_on_change)`.
9. Jika patut hantar & ada recipients:
   - Bina mesej via `buildMessage()` (format: "Dear Recipient, / {subject} - {date} / {ocr_text} / Thank you")
   - Loop setiap recipient, hantar ikut `type` (email / whatsapp / whatsapp_group —
     dua jenis WhatsApp guna `sendWhatsApp()` yang sama, cuma JID berbeza)
   - Kumpul error individu tanpa stop keseluruhan proses
10. Rekod semua ke `history` table, return row yang baru dicipta.

### 7.6 Ollama OCR Prompt (Full)

```
You are an OCR specialist. Extract ALL text from this image as accurately as possible.

Rules:
- Output plain text only, no commentary, no preamble, no labels
- Preserve the original table structure: one row per line, separate columns with " | "
- Read numbers, dates, and project IDs exactly as shown
- If text is unclear, write [unclear] for that part
- Skip decorative elements (icons, status dots, etc.)
- Preserve reading order (left-to-right, top-to-bottom)
```

---

## 8. API Reference Lengkap

Semua route (kecuali auth pendaftaran/login) memerlukan header
`Authorization: Bearer <jwt>`. JWT expiry: **7 hari**.

### 8.1 Auth — `/api/auth`

| Method | Path | Rate Limit | Body | Deskripsi |
|---|---|---|---|---|
| POST | `/register` | 10/jam | `{name, email, password}` | Daftar + auto-hantar email verifikasi (jika SMTP user itu sudah ada — biasanya belum) |
| POST | `/login` | 30/15min | `{email, password}` | Login → `{token, user, warning?}`. Lockout 15 min selepas 5 gagal |
| GET | `/me` | — | — | Info user semasa |
| GET | `/verify-email?token=` | — | — | Sahkan token verifikasi email |
| POST | `/resend-verification` | — (auth) | — | Hantar semula email verifikasi |
| POST | `/forgot-password` | 5/jam | `{email}` | Selalu return OK (elak email enumeration) |
| POST | `/reset-password` | — | `{token, password}` | Reset password guna token |
| POST | `/change-password` | — (auth) | `{current_password, new_password}` | Tukar password (perlu login) |
| PUT | `/profile` | — (auth) | `{name}` | Update nama |
| GET | `/login-history` | — (auth) | — | 20 log login terkini user |

### 8.2 Jobs — `/api/jobs`

| Method | Path | Body | Deskripsi |
|---|---|---|---|
| GET | `/` | — | Semua job milik user, termasuk `next_run` & `last_run` |
| POST | `/` | job fields | Cipta job baru; auto-schedule cron; lazy-connect WhatsApp jika ada recipient WA |
| GET | `/:id` | — | Detail 1 job |
| PUT | `/:id` | partial fields | Update job (reschedule cron automatik) |
| DELETE | `/:id` | — | Padam job (cascade: recipients, items, history) |

### 8.3 Job Items (Multi-URL) — `/api/jobs/:jobId/items`

| Method | Path | Body | Deskripsi |
|---|---|---|---|
| GET | `/` | — | Senarai URL items dalam job |
| POST | `/` | `{label, target_url, crop_x/y/w/h, sort_order}` | Tambah URL |
| PUT | `/:itemId` | partial fields | Update item |
| DELETE | `/:itemId` | — | Padam item |

### 8.4 Recipients — `/api/jobs/:jobId/recipients`

| Method | Path | Body | Deskripsi |
|---|---|---|---|
| GET | `/` | — | Senarai recipient job |
| POST | `/` | `{type: 'email'|'whatsapp'|'whatsapp_group', value, label?}` | Tambah recipient. `whatsapp_group` mesti JID `...@g.us` |
| DELETE | `/:rid` | — | Padam recipient |

### 8.5 Runs & History — `/api/jobs/:id`

| Method | Path | Deskripsi |
|---|---|---|
| POST | `/run` | Trigger run manual serta-merta → 201 + history row (409 jika job paused) |
| GET | `/history` | 50 run terkini job tersebut |

### 8.6 WhatsApp — `/api/whatsapp` (per user)

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/status` | `{status, qr}` — status sesi user semasa |
| GET | `/qr` | Sama seperti status; lazy-connect jika masih `disconnected` |
| GET | `/groups` | `{groups: [{jid, subject, participants, announce}]}` — senarai group yang akaun sertai. 409 jika belum connect |
| POST | `/connect` | Trigger connect manual |
| POST | `/disconnect` | Logout + clear session + auto-reconnect untuk QR baru |

### 8.7 Email Settings — `/api/email` (per user)

| Method | Path | Body | Deskripsi |
|---|---|---|---|
| GET | `/` | — | Config SMTP semasa (password disembunyikan) |
| PUT | `/` | `{smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, use_tls}` | Simpan/kemaskini config |
| POST | `/verify` | — | Test sambungan SMTP (`transporter.verify()`) |
| DELETE | `/` | — | Padam config |

### 8.8 Preview — `/api/preview`

| Method | Path | Body | Deskripsi |
|---|---|---|---|
| POST | `/` | `{target_url}` | Full-page screenshot untuk crop tool → `{screenshot_url}` |

### 8.9 Health — `/api/health`

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/` | 7 status check (lihat [§17](#17-troubleshooting)) |

Static files: `GET /static/*` → map ke folder `data/` (screenshot images).

---

## 9. Data Flow — Bagaimana Sistem Berfungsi

```
1. USER cipta JOB
   → Isi URL, drag crop area, pilih schedule, tambah recipients
   → (Opsyenal) enable multi-URL mode, tambah URL lain dengan crop sendiri

2. SCHEDULER (node-cron) trigger ikut schedule_cron
   → Setiap kali job dicipta/dikemaskini/dipadam, scheduler
     auto register/unregister cron task

3. RUNNER (services/runner.js) jalan
   → CAPTURE: Playwright load URL, tunggu 8s, screenshot + crop
   → OCR: hantar screenshot ke Ollama vision LLM, dapat teks terstruktur
   → (jika multi-URL: ulang untuk setiap item, gabung hasil)

4. CHANGE DETECTION
   → Banding ocr_text baru dengan ocr_text run terakhir (dari HISTORY)
   → changed_flag = 1 jika berbeza / tiada run sebelumnya

5. Keputusan notify
   → changed_flag=0 DAN notify_only_on_change=true → skip notify, log je
   → changed_flag=1 ATAU notify_only_on_change=false → proses notify

6. NOTIFY (jika patut)
   → Loop semua RECIPIENT job
   → type=email  → sendEmail() guna SMTP user tersebut
   → type=whatsapp → sendWhatsApp() guna sesi WA user tersebut
   → Kumpul error individu (tidak stop keseluruhan proses)

7. REKOD ke HISTORY
   → screenshot_path, ocr_text, changed_flag, delivery_status, error_message
```

---

## 10. Scheduler & Cron Logic

`backend/src/scheduler/index.js` menyimpan `Map<jobId, {task, cron}>` dalam
memory.

- `scheduleJob(job)` — stop task lama (jika ada), validate cron string
  (`node-cron.validate()`), daftar task baru jika `status === 'active'`.
- `unscheduleJob(jobId)` — stop & buang dari map (dipanggil semasa delete job).
- `getJobNextRuns()` — kira next-run untuk **semua** job berjadual guna
  `cron-parser` dengan timezone **`Asia/Kuala_Lumpur`** — digunakan frontend
  untuk paparkan countdown "Next Run".
- `initScheduler()` — dipanggil semasa startup, load semua job `active` dari
  DB dan daftar cron masing-masing.

### SchedulePicker UI Logic (Frontend)

Komponen `SchedulePicker.jsx` translate antara cron string dan UI mesra
pengguna:

| Mode | Contoh Input UI | Cron Dihasilkan |
|---|---|---|
| Interval (minit) | Every 15 minutes | `*/15 * * * *` |
| Interval (jam) | Every 6 hours | `0 */6 * * *` |
| Alarm (harian) | Daily at 08:00 | `0 8 * * *` |
| Alarm (hari tertentu) | Weekdays at 08:00 | `0 8 * * 1-5` |

Quick-select preset: Weekdays (1-5), Weekends (0,6), Every day (0-6).

---

## 11. Frontend — Struktur & Pages

### Routing (`App.jsx`)

| Path | Page | Auth? |
|---|---|---|
| `/login` | Login.jsx | Public |
| `/forgot-password` | ForgotPassword.jsx | Public |
| `/reset-password` | ResetPassword.jsx | Public |
| `/verify-email` | VerifyEmail.jsx | Public |
| `/` | Dashboard.jsx | Private |
| `/jobs/new` | JobForm.jsx | Private |
| `/jobs/:id/edit` | JobForm.jsx | Private |
| `/jobs/:id/history` | JobHistory.jsx | Private |
| `/jobs/:id/compare` | CompareView.jsx | Private |
| `/whatsapp` | WhatsApp.jsx | Private |
| `/email` | EmailSettings.jsx | Private |
| `/health` | HealthCheck.jsx | Private |
| `/profile` | Profile.jsx | Private |

`PrivateRoute` redirect ke `/login` jika `token` tiada dalam `AuthContext`.

### Komponen Penting

**`AppShell.jsx`** — Layout utama (sidebar 260px + topbar sticky 64px):
- Poll status WhatsApp setiap 10 saat (dot indicator kat sidebar nav)
- Live clock Malaysia (`Asia/Kuala_Lumpur`), update setiap saat
- Responsive: sidebar slide off-screen di bawah breakpoint `lg`

**`CropSelector.jsx`** — Canvas drag-box untuk pilih crop area:
- Guna `useRef` (bukan state) untuk drag logic — elak stale closure & re-render
  berlebihan semasa drag
- Dua canvas resolution: normal (960×540) dan fullscreen (1920×1080, guna
  React Portal supaya escape `backdrop-filter` parent)
- Handle resize di 4 penjuru, overlay gelap di luar crop box, label peratusan
  live semasa drag

**`CroppedPreview.jsx`** — Papar hasil crop sebenar:
- Cache image loaded, hanya re-crop bila crop value berubah (rounded ke 1 d.p.
  untuk elak re-render berlebihan semasa drag)

**`SchedulePicker.jsx`** — Toggle Interval/Alarm, hari toggle bulat (M/T/W/T/F/S/S),
quick presets, live cron preview.

**`api.js`** — `apiFetch()` wrapper: auto attach `Authorization: Bearer` dari
`localStorage`, handle 204 No Content, throw `Error(body.error)` jika !ok.

**`auth.jsx`** — `AuthContext` simpan `token` + `user` (decoded dari JWT
payload guna `atob()`, **tanpa** verify signature client-side — hanya untuk
paparan UI).

---

## 12. Design System

Nama tema: **"Obsidian Flux"** (dark premium SaaS). Rujuk penuh di
`FRONTEND_DESIGN_SPEC.md`. Ringkasan:

### Warna Utama
| Token | Hex | Guna |
|---|---|---|
| Background | `#0a0b14` / `#12131c` | App background terdalam |
| Surface | `#0f1120` / `#161827` | Kad, sidebar, topbar |
| Primary (Indigo) | `#6366f1` / `#c0c1ff` | Butang, link, aksen utama |
| Secondary (Violet) | `#8b5cf6` | Gradient brand (logo, avatar) |
| Success | `#10b981` | Connected, sent, active |
| Warning | `#f59e0b` | Paused, awaiting, unverified |
| Danger | `#f43f5e` | Error, failed, delete |

### Typography
- Heading: **Plus Jakarta Sans** (700–800 weight)
- Body: **DM Sans** (400–500 weight)
- Mono (URL/cron/OCR/timestamp): **JetBrains Mono**

### Prinsip Reka Bentuk
1. Dark premium, bukan hitam pekat — guna `#0a0b14`/`#12131c`
2. Indigo sebagai warna interaktif utama (bukan biru)
3. Border halus (`rgba(255,255,255,.06)`), naik pekat bila hover
4. Glassmorphism pada topbar (`backdrop-filter: blur(16px) saturate(140%)`)
5. Badge pill sentiasa ada dot berwarna sebelum teks
6. Data (URL, cron, timestamp, OCR text) sentiasa guna monospace
7. Animasi stagger untuk senarai (fade-in-up, delay 0.05s per item)
8. Gradient brand `linear-gradient(135deg, indigo, violet)` untuk logo/avatar

Implementasi guna **Tailwind CSS v4** dengan custom `@theme` tokens dalam
`index.css` (warna, font, spacing, radius semua didefinisikan sebagai CSS
custom properties lalu dipetakan ke utility classes Tailwind).

---

## 13. Keselamatan (Security)

| Ciri | Implementasi |
|---|---|
| Password hashing | bcrypt, cost factor 10 |
| Session | JWT, `expiresIn: '7d'`, secret dari `JWT_SECRET` env |
| Account lockout | 5 percubaan gagal → lock 15 minit (`LOCKOUT_DURATION_MS`) |
| Rate limiting | Login: 30/15min · Register: 10/jam · Forgot-password: 5/jam (per IP, via `express-rate-limit`) |
| Trust proxy | `app.set('trust proxy', 1)` — untuk dapat real client IP di belakang nginx (rate limit + login history tepat) |
| IP sanitization | Strip prefix `::ffff:` (IPv6-mapped IPv4), truncate ke 45 char |
| Email enumeration protection | `/forgot-password` sentiasa return `{ok:true}` walau email tak wujud |
| Password reset TTL | 30 minit, token 64-char hex (crypto.randomBytes 32) |
| Email verification TTL | 24 jam |
| Data isolation | Semua query job/recipient/history di-scope ikut `user_id` — user hanya boleh akses job sendiri |
| Password-changed notification | Auto-hantar email bila password berubah (guna SMTP user sendiri) |
| Login history | Setiap percubaan login (berjaya/gagal) direkod dengan IP + user-agent |

---

## 14. Environment Variables

### `backend/.env` (Manual Mode)
```env
# Server
PORT=3001
JWT_SECRET=change-me-to-a-long-random-string

# MySQL (default guna localhost jika tak diset)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dashboard_monitor
DB_USER=monitor_user
DB_PASS=monitor_pass

# App base URL (untuk link dalam email verifikasi/reset)
APP_BASE_URL=http://localhost:3000

# Ollama OCR
OLLAMA_URL=http://localhost:11434
OLLAMA_VISION_MODEL=minicpm-v4.6
```

> **Nota:** SMTP **tidak lagi** dikonfigurasi via `.env` untuk notification
> emails — setiap user set SMTP sendiri di halaman "Email Settings"
> (`user_smtp` table). `.env.example` masih tunjuk `SMTP_HOST` dsb. sebagai
> peninggalan tapi ia sudah tidak dibaca oleh `services/email.js`.

### `backend/.env.docker` (Docker Mode)
Sama seperti di atas, tapi `DB_HOST`, `DB_PORT`, `OLLAMA_URL` di-override
automatik oleh `environment:` block dalam `docker-compose.yml` (nama servis
Docker: `mysql`, `ollama`).

### Frontend
Tiada `.env` — konfigurasi proxy terus dalam `vite.config.mjs`:
```js
server: {
  port: 5173,
  proxy: { '/api': 'http://localhost:3001', '/static': 'http://localhost:3001' },
}
```

---

## 15. Setup & Installation

### Prasyarat
| Tool | Keperluan |
|---|---|
| Node.js | v22+ |
| MySQL | 8.x (lokal atau via Docker) |
| Ollama | + model `minicpm-v4.6` (~1.6GB) |
| Playwright | Chromium browser (auto-install via `npx playwright install`) |

### Langkah Manual

```bash
# 1. Setup MySQL — cipta database & user
mysql -u root -p
CREATE DATABASE dashboard_monitor;
CREATE USER 'monitor_user'@'localhost' IDENTIFIED BY 'monitor_pass';
GRANT ALL PRIVILEGES ON dashboard_monitor.* TO 'monitor_user'@'localhost';

# 2. Ollama
ollama pull minicpm-v4.6
ollama serve

# 3. Backend
cd backend
npm install
npx playwright install chromium
cp .env.example .env      # edit DB_HOST/DB_USER/DB_PASS/JWT_SECRET
npm run dev                # nodemon, port 3001

# 4. Frontend (terminal baru)
cd frontend
npm install
npm run dev                # Vite, port 5173
```

Buka `http://localhost:5173` → Register akaun → Setup SMTP sendiri di
`/email` → Connect WhatsApp sendiri di `/whatsapp` → Cipta job pertama.

### Initial Setup Selepas Register
1. **Register** akaun di `/login` (tab Register)
2. **Configure SMTP sendiri** di `/email` (contoh: Gmail dengan App Password)
   → klik "Verify Connection"
3. **Connect WhatsApp sendiri** di `/whatsapp` → scan QR guna phone sendiri
4. **Cipta job monitoring** di `/jobs/new`:
   - Isi nama job, target URL
   - Klik "Capture Screenshot" → drag crop area
   - Set schedule (Interval atau Alarm mode)
   - Tambah recipient (email / WhatsApp peribadi / WA Group — group dipilih
     dari dropdown senarai group sebenar, tak perlu taip JID)
   - (Opsyenal) enable Multi-URL mode untuk monitor >1 URL dalam 1 job

---

## 16. Docker Deployment

```bash
cp backend/.env.docker backend/.env
notepad backend/.env   # set JWT_SECRET, APP_BASE_URL (VPS IP/domain)

docker compose up -d --build
docker exec monitor-ollama ollama pull minicpm-v4.6
```

Akses:
- Frontend: `http://localhost` (atau IP VPS)
- Backend API: `http://localhost:3001`
- phpMyAdmin: `http://localhost:8181` (root/rootpassword)
- Ollama: `http://localhost:11434`

### Volumes (persist data)
| Volume | Isi |
|---|---|
| `mysql-data` | Database MySQL |
| `backend-data` | Screenshot, preview |
| `backend-auth` | Sesi WhatsApp Baileys (semua user) |
| `ollama-models` | Model Ollama yang di-download |

### Perintah Berguna
```bash
docker compose logs -f [service]     # tengok log
docker compose restart backend       # restart 1 servis
docker compose down                  # stop semua (data kekal)
docker compose down -v               # stop + padam semua data (reset penuh)
docker exec -it monitor-backend sh   # masuk shell container
```

---

## 17. Troubleshooting

### System Health Checks (`/health` page — auto-refresh 15s)
| Check | Apa yang disemak |
|---|---|
| MySQL Database | `SELECT 1` berjaya |
| WhatsApp (Baileys) | Status sesi user semasa (`connected`/`awaiting_qr`/`disconnected`) |
| Email SMTP (yours) | Config wujud + `is_verified` flag |
| Playwright | Package `playwright` boleh di-resolve |
| Data Directory | Boleh tulis (`fs.accessSync(W_OK)`) |
| Scheduler | Bilangan job aktif dijadualkan |
| Ollama OCR | `GET /api/tags` responsive + model wujud |

### Masalah Biasa

| Masalah | Punca / Penyelesaian |
|---|---|
| "database is locked" | Legasi SQLite sahaja — tak relevan lagi kerana kini guna MySQL |
| "Ollama not running" | `ollama serve` atau buka Ollama Desktop app |
| "Model not found" | `ollama pull minicpm-v4.6` |
| WhatsApp tak connect | Semak backend jalan, semak folder `auth_info/{userId}/` wujud, scan QR semula di `/whatsapp` |
| "SMTP not configured" | Isi & verify SMTP di halaman `/email` |
| Preview: "Cannot navigate to invalid URL" | Pastikan URL ada `http://` atau `https://` |
| Frontend blank | `npm install` semula, semak console browser |
| MySQL connection refused | Semak `DB_HOST`/`DB_PORT`/kredensial dalam `.env`, semak servis MySQL jalan |

---

## 18. Known Gotchas / Technical Notes

### MySQL (`mysql2/promise`)
```js
// Pattern konsisten digunakan seluruh codebase — helper functions:
queryAll(sql, params)   // → array of rows
queryGet(sql, params)   // → single row atau undefined
queryRun(sql, params)   // → { insertId, affectedRows }

// Guna placeholder `?`, params SENTIASA array
await queryRun('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
```

### Screenshot & Crop
- Viewport tetap `1280×720` — crop % dikira relatif kepada saiz ini.
- Kalau resolusi screenshot preview vs capture sebenar berlainan, % tetap
  konsisten kerana ia peratusan bukan pixel mutlak.
- Delay 8 saat selepas `load` event — untuk dashboard berat (Power BI, embed
  chart) yang render lambat selepas `load` fire.

### WhatsApp (Baileys)
- Session **per user** disimpan `auth_info/{userId}/` — folder ini WAJIB
  kekal (jangan padam) supaya user tak perlu scan QR berulang kali.
- Server yang kerap restart boleh sebabkan WhatsApp logout paksa (Baileys
  behaviour, bukan bug aplikasi).
- Auto-reconnect 5 saat, KECUALI jika disconnect sebab `loggedOut` — dalam
  kes ini session dipadam terus dan perlu QR baru.

### Email
- Cache transporter per user (TTL 5 minit) — jika user tukar SMTP config,
  cache di-invalidate segera (`invalidateCache()`) supaya config baru
  dipakai serta-merta, bukan tunggu TTL habis.

### Frontend
- `CropSelector` guna `useRef` untuk drag state, BUKAN `useState` — sebab
  kalau guna state, setiap mousemove akan trigger re-render yang menyebabkan
  stale closure bug semasa drag pantas.
- `cropProp` di `JobForm.jsx` dibalut `useMemo` untuk elak re-render
  `CropSelector` yang tak perlu.
- Nginx: `index.html` **tidak** boleh di-cache (sebab reference hashed asset
  filename yang berubah setiap build) — jika ini tersilap cache, browser akan
  load bundle JS/CSS lama walau server dah update.

### `is_admin` Flag — Legasi
Column `is_admin` dalam table `users` masih wujud dari reka bentuk asal
(penanda "siapa pegang sesi WhatsApp global"). Sejak sistem jadi
**multi-tenant** (setiap user ada WhatsApp/SMTP sendiri), flag ini
**tidak lagi mengawal akses fungsian apa-apa** — ia cuma dipaparkan sebagai
label "Role: Admin/User" di halaman Profile untuk tujuan maklumat sahaja.

---

## 19. Skop & Batasan Projek

### Dalam Skop
- 1–5 monitoring job setiap user (ringan, tak over-engineer)
- Email + WhatsApp dual notification channel
- Setiap user connect WhatsApp/SMTP sendiri (multi-tenant)
- Multi-URL monitoring dalam 1 job
- Interval atau Alarm-style scheduling
- Boleh run lokal (dev) atau Docker (VPS/production)

### Di Luar Skop (Fasa Ini)
- Role/permission hierarchy (admin panel, viewer-only, dll.) — cuma 1 role
  `USER` tunggal
- Mobile app / push notification native
- AI-based content-change summarization (setakat ini hanya raw text diff
  via `changed_flag`)
- Auto-scaling / high-availability multi-server deployment

### Risiko Diketahui
- Layout dinamik/lazy-loading pada target website boleh jejaskan ketepatan
  crop area — mitigasi sedia ada: delay 8 saat tetap (bukan `waitForSelector`
  dinamik, jadi laman yang sangat lambat mungkin masih ter-screenshot sebelum
  siap render sepenuhnya).
- Server restart kerap boleh sebabkan sesi WhatsApp logout — pastikan server
  stabil.

---

## 20. Sejarah Perkembangan (Git History)

Susunan komit terkini (terbaru dahulu), menunjukkan evolusi sebenar projek:

| Komit | Perubahan |
|---|---|
| `a8388d5` | Fix frontend tak refresh — nginx cache headers untuk `index.html` |
| `6acb4ba` | QA fixes — trust proxy, rate limiter buckets, IP sanitization, health detail |
| `7de82b6` | **Redesign frontend** dengan Stitch.ai Obsidian Flux design system |
| `a58f08d` | Set `APP_BASE_URL` ke VPS IP untuk link email production |
| `5e269de` | **Auth security** — email verification, password reset, profile, rate limiting |
| `4038a1c` | **Multi-tenant Email** — 1 user = 1 SMTP sender |
| `29ead78` | **Multi-tenant WhatsApp** — 1 user = 1 sambungan WhatsApp |
| `60558c8` | Fix WhatsApp disconnect — generate QR baru dan bukan status stuck |
| `0d290d5` | Fix env var `DATA_DIR`/`AUTH_DIR` di servis yang tertinggal |
| `81643c7` | Fix path static file serving dalam Docker |
| `de8928d` | Fix route `whatsapp.js` — tukar `requireAdmin` ke async MySQL query |
| `fa55dd5` | Pindah Dockerfile ke root projek untuk Hostinger Docker Manager |
| `89b98d5` | Explicit build context & dockerfile path dalam docker-compose |
| `d3cd86f` | **Migrate database** dari SQLite ke MySQL + tambah phpMyAdmin |
| `1b8d388` | Tambah bahagian Docker quickstart ke `STARTUP_GUIDE.md` |

Trend jelas: projek bermula sebagai sistem SQLite + single-admin WhatsApp
(ikut spec asal `CLAUDE.md`), kemudian **berkembang jadi platform
multi-tenant penuh** (setiap user urus WhatsApp & email sendiri) yang
dioptimumkan untuk deployment production di VPS via Docker.

---

## 21. Appendix

### A. Test Accounts (Development)
| Email | Password | Nota |
|---|---|---|
| `test@example.com` | `password123` | User biasa |
| `admin@example.com` | `adminpass` | `is_admin=1` — label sahaja, tiada kesan fungsian |

### B. Format Nombor WhatsApp
Format JID Baileys: `<nombor_penuh_dgn_kod_negara>@s.whatsapp.net`

Contoh: `60123456789@s.whatsapp.net` (Malaysia, tanpa `+` atau `0` depan).

**Group** guna suffix berbeza: `@g.us`
(contoh `120363270041050009@g.us` atau `60182770103-1585910620@g.us`).
JID group tak perlu ditaip manual — pilih je dari dropdown dalam Job Form,
yang ambil senarai dari `GET /api/whatsapp/groups`. Syarat: akaun WhatsApp
yang connect mesti **sudah jadi ahli** group tersebut (tiada API untuk join),
dan untuk group "announce only" akaun itu mesti admin, jika tidak send gagal.

`normalizeJid()` dalam `services/whatsapp.js` auto-handle format biasa:
- `0123456789` → `60123456789@...`
- `123456789` → `60123456789@...`
- `60123456789` → guna terus

### C. Rujukan Dokumen Lain
| Dokumen | Kandungan |
|---|---|
| `CLAUDE.md` | Spec/requirement asal projek (Bahasa Melayu) |
| `README.md` | Overview ringkas + quickstart |
| `PROJECT_STATUS.md` | Status handoff, API list ringkas, gotchas teknikal |
| `STARTUP_GUIDE.md` | Panduan startup step-by-step (manual + Docker) |
| `FRONTEND_DESIGN_SPEC.md` | Spec design system lengkap (754 baris) untuk recreate UI |
| `PRESENTATION.md` | Draf 12-slide untuk presentation/demo panel |

### D. Icon System (Frontend)
Guna **Material Symbols Outlined** (Google Fonts), bukan custom SVG icon
component seperti dinyatakan dalam draf design spec awal — icon dipanggil
terus via `<span className="material-symbols-outlined">nama_icon</span>`.

---

*Dokumen ini dijana berdasarkan analisis kod sumber sebenar pada
28 Julai 2026. Kemas kini dokumen ini apabila terdapat perubahan besar pada
arkitektur, schema database, atau API.*
