# Dashboard Monitor & Alert App

## Ringkasan Projek

Web app untuk monitor dashboard/status page secara automatik: screenshot area
tertentu pada sebuah URL, extract teks dengan OCR, bandingkan dengan hasil
run sebelumnya, dan hantar notifikasi (Email + WhatsApp) mengikut schedule —
tapi hanya bila data berubah (elak spam notification).

Asal dari konsep WhatsApp OCR tool sedia ada, ditambah: custom screenshot
area, multi-channel recipient (email + WhatsApp), dan scheduled delivery.

Multi-user: setiap user ada job monitoring sendiri (1–5 job/user dijangka).

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite
- **Screenshot**: Playwright (headless browser)
- **OCR**: Tesseract.js
- **Scheduler**: node-cron
- **Email**: Nodemailer (SMTP)
- **WhatsApp**: Baileys — **1 nombor admin dikongsi semua user**, scan QR
  sekali, session disimpan locally (folder `auth_info`)
- **Frontend**: React + visual crop/area selector (canvas-based drag box)

## Keputusan Skop (Fasa Ini)

- **WhatsApp sender**: 1 nombor admin untuk semua user (bukan setiap user
  link nombor sendiri)
- **Hosting**: run lokal di PC/laptop sendiri dahulu (bukan cloud/24-7 dulu)
- **Skala**: 1–5 monitoring job setiap user — ringan, takyah over-engineer
- **User role**: 1 role tunggal (`USER`). Tiada hierarki admin/viewer dalam
  sistem — `is_admin` flag cuma penanda siapa pegang sesi WhatsApp, bukan
  permission level berasingan.

## Modules (8)

| Module | Tanggungjawab |
|---|---|
| M1 — Auth & User | Pendaftaran, login, sesi |
| M2 — Job Management | CRUD monitor job (URL, crop area, schedule, recipients) |
| M3 — Capture & OCR | Screenshot engine + extract teks |
| M4 — Scheduler | Cron trigger & change detection |
| M5 — Email Service | Hantar emel via SMTP (Nodemailer) |
| M6 — WhatsApp Service | Hantar mesej via Baileys (nombor peribadi & group) |
| M7 — History & Log | Rekod setiap run & status penghantaran |
| M8 — Dashboard UI | Frontend: senarai job, crop tool, history view |

## Data Model (ERD ringkas)

```
USER 1───M JOB 1───M RECIPIENT
            │
            1
            │
            M
         HISTORY
```

### USER
| Field | Jenis | Keterangan |
|---|---|---|
| user_id | INTEGER (PK) | ID unik pengguna |
| name | VARCHAR(100) | Nama penuh |
| email | VARCHAR(150) | Emel login (unik) |
| password_hash | VARCHAR(255) | Kata laluan ter-hash |
| is_admin | BOOLEAN | Penanda admin WhatsApp (bukan permission role) |
| created_at | DATETIME | Tarikh daftar |

### JOB
| Field | Jenis | Keterangan |
|---|---|---|
| job_id | INTEGER (PK) | ID unik job |
| user_id | INTEGER (FK) | Pemilik job |
| job_name | VARCHAR(100) | Nama monitor |
| target_url | TEXT | URL website disasar |
| crop_x, crop_y, crop_width, crop_height | FLOAT | Koordinat area dalam % (bukan pixel mutlak — kekal tepat walau resolusi screenshot berubah) |
| schedule_cron | VARCHAR(50) | Jadual cron (UI guna simple picker: "setiap X jam/hari", convert ke cron di belakang tabir) |
| notify_only_on_change | BOOLEAN | Default TRUE — hantar notifikasi cuma bila OCR text berubah dari run lepas |
| status | ENUM | active / paused |
| created_at | DATETIME | |

### RECIPIENT
| Field | Jenis | Keterangan |
|---|---|---|
| recipient_id | INTEGER (PK) | |
| job_id | INTEGER (FK) | |
| type | ENUM | email / whatsapp / whatsapp_group |
| value | VARCHAR(150) | Alamat emel, JID peribadi (`60123456789@s.whatsapp.net`), atau JID group (`120363...@g.us`) |
| label | VARCHAR(150) | Nama paparan (nama group) — supaya UI tak tunjuk JID mentah |
| created_at | DATETIME | |

### HISTORY
| Field | Jenis | Keterangan |
|---|---|---|
| history_id | INTEGER (PK) | |
| job_id | INTEGER (FK) | |
| run_at | DATETIME | |
| screenshot_path | TEXT | Lokasi fail screenshot |
| ocr_text | TEXT | Hasil extract OCR |
| changed_flag | BOOLEAN | Berubah dari run lepas? |
| delivery_status | ENUM | sent / failed / pending |
| error_message | TEXT | Sebab gagal (jika ada) |

## Data Flow (logik utama)

1. User cipta job → simpan ke `JOB` (M2)
2. Scheduler (M4) trigger ikut `schedule_cron`
3. M3 load `target_url` dengan Playwright → screenshot ikut `crop_x/y/w/h`
   → extract teks dengan Tesseract
4. Bandingkan `ocr_text` baru dengan rekod terakhir di `HISTORY` untuk job
   tersebut
5. Jika `notify_only_on_change` = TRUE dan teks sama → skip, rekod je ke
   `HISTORY` (jangan hantar)
6. Jika berubah (atau flag = FALSE) → M5/M6 hantar ke semua `RECIPIENT`
   job tersebut → rekod `delivery_status` ke `HISTORY`

## Urutan Build (5 Phase)

1. **Core Backend** — Express app, SQLite schema, Auth, CRUD job
2. **Screenshot + OCR** — Playwright capture, area selector logic, Tesseract
3. **Notification Senders** — setup Nodemailer; setup Baileys (QR scan flow,
   simpan session ke `auth_info/`)
4. **Scheduler** — node-cron per job, change detection, delivery log
5. **Frontend Dashboard** — senarai job, crop tool (drag box atas screenshot
   preview), history view dengan thumbnail

## Nota Teknikal Penting

- Crop area disimpan sebagai **peratusan**, bukan pixel — supaya tepat walau
  resolution screenshot berbeza antara run.
- Schedule UI: jangan suruh user taip cron expression mentah. Bagi simple
  picker ("Every [X] [minutes/hours/days] at [time]") yang convert ke cron
  format di backend.
- Baileys session kena stay persistent — server jangan kerap restart, atau
  WhatsApp boleh kena logout dan perlu scan QR semula.
- Layout dinamik / lazy-loading content pada target website boleh jejaskan
  ketepatan crop area — pertimbang wait-for-selector atau delay sebelum
  screenshot.
- Setiap user hanya boleh akses job miliknya sendiri (scope query by
  `user_id`), walaupun tiada role hierarchy.

## Yang TIDAK dalam skop fasa ini

- Multi-tenant WhatsApp (setiap user nombor sendiri) — masih 1 nombor admin
- Hosting 24/7 di luar PC sendiri
- Role/permission tambahan (admin panel, viewer-only, dsb.)
