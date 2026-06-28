# Dashboard Monitor & Alert App — Presentation Flow

> **Total Slides: 12**
> **Design Theme Suggestion:** Dark (Navy/Slate background · Cyan or Green accent · White text)
> **Target Audience:** Technical / Intern project review panel

---

## SLIDE 1 — Cover / Title

**Title:** Dashboard Monitor & Alert App
**Subtitle:** Automated Web Monitoring · OCR Change Detection · Smart Multi-Channel Alerts

**Body (tagline):**
> "Stop checking manually. Let the system tell you when something changes."

**Visual Suggestion:**
- Split layout: left = browser window with a crop selection box highlighted; right = phone receiving WhatsApp notification
- Subtle grid/circuit background pattern

---

## SLIDE 2 — Problem Statement

**Title:** The Problem

**3 Pain Points (icon + text each):**

| # | Problem |
|---|---------|
| 1 | Teams manually refresh dashboards and status pages to detect changes — inefficient and error-prone |
| 2 | There is no automated way to know *when* specific data on a webpage has changed |
| 3 | No unified alert system to notify the right people via Email or WhatsApp instantly |

**Key Insight (callout box):**
> "A person checking a dashboard every hour wastes ~250 hours/year doing nothing but refreshing a page."

**Visual Suggestion:** Timeline showing manual check cycle vs. automated alert spike

---

## SLIDE 3 — The Solution

**Title:** What This App Does

**One-liner:**
> Automatically screenshots a specific area of any URL, extracts text with OCR, compares it to the previous run, and sends notifications — only when something actually changes.

**4-Step Flow Diagram:**

```
[ Schedule Trigger ]
        ↓
[ Screenshot + Crop Area ]
        ↓
[ OCR Text Extraction ]
        ↓
[ Changed? → Notify via Email / WhatsApp ]
         No Change? → Log Only (no spam)
```

**Visual Suggestion:** Horizontal pipeline with icons for each step; highlight the "Changed?" decision diamond

---

## SLIDE 4 — Key Features

**Title:** Core Features at a Glance

**Feature Grid (2 columns):**

| Feature | Detail |
|---------|--------|
| Custom Crop Area | Drag-and-select a specific region on a webpage — only that area is monitored |
| OCR Text Extraction | Tesseract.js reads text from the cropped screenshot automatically |
| Smart Change Detection | Notifications are sent **only when text changes** — eliminates alert spam |
| Multi-Channel Alerts | Supports both **Email** (SMTP) and **WhatsApp** (Baileys) simultaneously |
| Flexible Scheduling | Simple UI picker: "Every X minutes/hours/days" — no raw cron syntax needed |
| Multi-User Support | Each user manages their own set of monitoring jobs independently |
| Full Run History | Every execution is logged with screenshot path, OCR result, and delivery status |
| Persistent WhatsApp Session | Single admin QR scan; session is stored locally and reused |

**Visual Suggestion:** 8 cards in a 2×4 grid with icons

---

## SLIDE 5 — Tech Stack

**Title:** Technology Stack

**Split into 3 columns:**

**Backend & Core**
- Node.js + Express — REST API server
- SQLite — Lightweight local database
- node-cron — Job scheduling engine

**Capture & Intelligence**
- Playwright — Headless browser for screenshots
- Tesseract.js — OCR engine for text extraction

**Notifications & Frontend**
- Nodemailer — Email delivery via SMTP
- Baileys — WhatsApp messaging (no paid API)
- React — Frontend UI
- HTML5 Canvas — Visual crop/area selector tool

**Visual Suggestion:** 3 vertical columns with tech logos; connect with lines to show layering (Frontend → Backend → Notification)

---

## SLIDE 6 — System Architecture

**Title:** System Architecture Overview

**Layered Diagram:**

```
┌─────────────────────────────────────┐
│          FRONTEND (React)           │
│  Job Form · Crop Tool · History UI  │
└──────────────────┬──────────────────┘
                   │ REST API
┌──────────────────▼──────────────────┐
│         BACKEND (Node/Express)      │
│  Auth · Job CRUD · Scheduler        │
│  Capture Engine · Change Detector   │
└──────┬──────────────────────┬───────┘
       │                      │
┌──────▼──────┐     ┌─────────▼──────┐
│   SQLite DB │     │  Notification  │
│  USER · JOB │     │  Email (SMTP)  │
│  HISTORY    │     │  WhatsApp (WA) │
│  RECIPIENT  │     └────────────────┘
└─────────────┘
```

**Notes:**
- All components run locally on a single machine
- No external cloud dependency in this phase

**Visual Suggestion:** Clean box-and-arrow architecture diagram

---

## SLIDE 7 — Data Flow (Step-by-Step)

**Title:** How It Works — End to End

**6-Step Numbered Flow:**

```
1. USER creates a Job
   → Sets URL, draws crop area, picks schedule, adds recipients

2. SCHEDULER fires at the configured cron time
   → Triggered by node-cron based on job's schedule_cron field

3. CAPTURE ENGINE runs
   → Playwright loads the URL in a headless browser
   → Takes a full-page screenshot
   → Crops to the defined area (stored as % coordinates)
   → Tesseract extracts text from the cropped image

4. CHANGE DETECTION compares result
   → Fetches the latest OCR text from HISTORY for this job
   → Diffs the new text against the previous

5. NO CHANGE detected
   → Log the run to HISTORY (changed_flag = FALSE)
   → Skip notification (prevent spam)

6. CHANGE detected (or notify_only_on_change = FALSE)
   → Send Email via Nodemailer to all email recipients
   → Send WhatsApp message via Baileys to all WA recipients
   → Log delivery_status (sent / failed) to HISTORY
```

**Visual Suggestion:** Vertical flowchart with decision diamond at step 4-5

---

## SLIDE 8 — Data Model (ERD)

**Title:** Database Design

**Entity Relationship Diagram:**

```
USER ──────< JOB >──────< RECIPIENT
                │
                └──────< HISTORY
```

**Table Summary:**

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| USER | user_id, email, password_hash, is_admin | Authentication & identity |
| JOB | job_id, target_url, crop_x/y/w/h, schedule_cron, status | Monitoring job config |
| RECIPIENT | type (email/whatsapp), value | Who gets notified |
| HISTORY | ocr_text, changed_flag, delivery_status, screenshot_path | Full audit log per run |

**Technical Note (callout):**
> Crop coordinates stored as **percentages (0–100%)**, not pixels — ensures accuracy regardless of screenshot resolution changes.

**Visual Suggestion:** Clean ERD boxes with PK/FK labels and relationship lines

---

## SLIDE 9 — Module Breakdown

**Title:** 8 System Modules

**Module Grid:**

| Module | Name | Responsibility |
|--------|------|---------------|
| M1 | Auth & User | Register, login, JWT session management |
| M2 | Job Management | Create, read, update, delete monitoring jobs |
| M3 | Capture & OCR | Run Playwright screenshot + Tesseract text extraction |
| M4 | Scheduler | node-cron per job, trigger M3, run change detection |
| M5 | Email Service | Send formatted email alerts via Nodemailer SMTP |
| M6 | WhatsApp Service | Send WA messages via Baileys; manage QR session |
| M7 | History & Log | Store every run result, delivery status, error logs |
| M8 | Dashboard UI | React frontend: job list, crop tool, history viewer |

**Visual Suggestion:** 8 tiles in a 4×2 grid, each with module number, name, and 1-line description

---

## SLIDE 10 — Build Phases / Roadmap

**Title:** Development Roadmap — 5 Phases

**Horizontal Timeline:**

```
Phase 1           Phase 2          Phase 3           Phase 4          Phase 5
──────────        ──────────       ──────────        ──────────       ──────────
Core Backend   Screenshot & OCR  Notifications     Scheduler        Frontend UI
─────────────  ────────────────  ─────────────     ─────────        ───────────
· Express app  · Playwright      · Nodemailer      · node-cron      · React app
· SQLite setup   setup             (Email SMTP)      per job        · Job list
· Auth (JWT)   · Crop area       · Baileys (WA)    · Change         · Crop tool
· Job CRUD       logic           · QR scan flow      detection        (canvas)
· DB schema    · Tesseract OCR   · Session store   · Delivery log   · History
                 integration     · auth_info/        to HISTORY       viewer
```

**Visual Suggestion:** 5 milestone cards on a left-to-right timeline bar; completed phases can be ticked

---

## SLIDE 11 — Scope & Constraints

**Title:** Current Scope & Known Constraints

**Two-column layout:**

**In Scope (This Phase)**
- Single shared WhatsApp admin number for all users
- Runs locally on developer's PC/laptop
- 1–5 monitoring jobs per user (lightweight)
- Single user role — no admin/viewer hierarchy
- Email + WhatsApp dual notification

**Out of Scope (Future Phases)**
- Per-user WhatsApp numbers (multi-tenant)
- 24/7 cloud hosting / deployment
- Admin panel & role-based access control
- Mobile app / push notifications
- AI-based content change summarization

**Risk Notes (callout):**
> - Dynamic / lazy-loaded pages may affect crop accuracy → mitigated with wait-for-selector strategy
> - Frequent server restarts will log out WhatsApp session → keep server stable, session in `auth_info/`

**Visual Suggestion:** Two boxes side by side — green checkmarks (in scope) vs. grey dashes (out of scope)

---

## SLIDE 12 — Summary & Demo

**Title:** Summary

**3 Key Takeaways:**

1. **Automates repetitive monitoring** — No more manual page checking; the system watches for you
2. **Smart alerts, zero spam** — Notifications only fire when content actually changes
3. **Practical & extendable** — Built modular; ready to scale to cloud or add features in future phases

**Tech Stack Recap (compact):**
> Node.js · Express · SQLite · Playwright · Tesseract.js · node-cron · Nodemailer · Baileys · React

**Closing Line:**
> "Built to solve a real problem — automatic, reliable, and notification-ready."

**[LIVE DEMO]** ← placeholder slide section for demo walkthrough

**Visual Suggestion:** Full-width closing slide with project name, dark background, and a single CTA: "Questions?"

---

## Appendix — Presenter Notes

### Suggested Timing (15–20 min total)

| Slide | Topic | Time |
|-------|-------|------|
| 1 | Cover | 30s |
| 2 | Problem | 1.5 min |
| 3 | Solution | 1.5 min |
| 4 | Features | 2 min |
| 5 | Tech Stack | 1.5 min |
| 6 | Architecture | 2 min |
| 7 | Data Flow | 2 min |
| 8 | Data Model | 1.5 min |
| 9 | Modules | 1.5 min |
| 10 | Roadmap | 1 min |
| 11 | Scope | 1 min |
| 12 | Summary + Demo | 3–5 min |

### Key Points to Emphasize
- The **"only notify on change"** logic is the core differentiator — prevents notification fatigue
- **Crop area in %** is a deliberate design decision for resolution-independence
- **Baileys** is used instead of WhatsApp Business API to avoid paid API costs
- System is **modular by design** — each of the 8 modules can be swapped or extended independently
