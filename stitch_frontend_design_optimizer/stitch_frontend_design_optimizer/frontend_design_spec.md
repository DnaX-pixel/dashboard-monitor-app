# Dashboard Monitor App — Frontend Design Specification

> Comprehensive description of every page, layout, and component for recreating the UI in Stitch.ai.

---

## 1. Global Design System

### Color Palette (Dark Premium SaaS)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0a0b14` | App background (deepest dark) |
| `--surface` | `#0f1120` | Cards, sidebar, topbar base |
| `--surface-2` | `#161827` | Inputs, inner panels, table headers |
| `--surface-3` | `#1c1f30` | Hover states, elevated surfaces |
| `--border` | `rgba(255,255,255,.06)` | Subtle borders |
| `--border-hi` | `rgba(255,255,255,.1)` | Hover borders |
| `--text` | `#e8eaf2` | Primary text (near-white) |
| `--text-muted` | `#7b8095` | Secondary text |
| `--text-dim` | `#9ca0b3` | Tertiary/label text |
| `--indigo` | `#6366f1` | Primary action color |
| `--indigo-dk` | `#4f46e5` | Primary hover |
| `--indigo-lt` | `#818cf8` | Active states, links |
| `--indigo-soft` | `rgba(99,102,241,.08)` | Active backgrounds, focus rings |
| `--violet` | `#8b5cf6` | Gradient end (brand icon, avatar) |
| `--success` | `#10b981` | Success states, connected, sent |
| `--warning` | `#f59e0b` | Paused, awaiting, warning |
| `--danger` | `#f43f5e` | Error, failed, delete |
| `--rose` | `#f43f5e` | Destructive actions |

### Typography

- **Headings**: `'Plus Jakarta Sans'` — 700-800 weight, letter-spacing `-0.02em`
- **Body**: `'DM Sans'` — 400-500 weight, base size 14px, line-height 1.6
- **Mono**: `'JetBrains Mono'` — used for URLs, cron expressions, timestamps, OCR text
- **Page title (h1)**: 24px, weight 800
- **Card title (h2)**: 15px, weight 700
- **Stat value**: 28px, weight 800
- **Stat label**: 11px, uppercase, weight 700, letter-spacing 0.08em
- **Sidebar section label**: 10px, uppercase, weight 700, letter-spacing 0.1em

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | 8px | Buttons, inputs, badges, small elements |
| `--r` | 12px | Canvas wraps, medium elements |
| `--r-md` | 14px | Cards, table wraps |
| `--r-lg` | 18px | QR code image |
| `--r-xl` | 24px | Large modals |
| `--r-full` | 9999px | Pills, day toggles, clock |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--sh-sm` | `0 1px 2px rgba(0,0,0,.2)` | Tab bar active |
| `--sh` | `0 2px 8px rgba(0,0,0,.18)` | Cards default |
| `--sh-md` | `0 8px 24px rgba(0,0,0,.25)` | Hover cards, stat cards |
| `--sh-lg` | `0 20px 50px rgba(0,0,0,.35)` | QR code |
| `--sh-indigo` | `0 8px 24px rgba(99,102,241,.25)` | Primary buttons, brand icon |

### Animations

- `fadeInUp` — 0.4s cubic-bezier(.16,1,.3,1) — page enter, card stagger
- `scaleIn` — 0.3s — QR code, cropped preview
- `glowPulse` — 2s infinite — connected status dot (WhatsApp)
- `floatY` — 3s ease-in-out infinite — empty state icon
- `spin` — 1s linear infinite — loading spinners
- `pulse` — opacity .4 ↔ 1 — pulsing indicators
- Stagger: job cards animate with `animationDelay: idx * 0.05s`

### Spacing & Layout

- **Sidebar width**: 260px (fixed left)
- **Topbar height**: 64px (sticky)
- **Content padding**: 28px
- **Max content width**: 1400px (centered)
- **Card padding**: 24px
- **Card gap**: 16px
- **Form gap**: 18px between form-groups

---

## 2. App Shell — Sidebar + Topbar Layout

### Sidebar (Left, Fixed)

**Container:**
- Width: 260px, fixed to left edge, full height
- Background: `--surface` (#0f1120)
- Border-right: 1px solid `--border`
- z-index: 100
- Slide transform on mobile (<900px): `translateX(-100%)`, toggled by `.open`

**Brand Header (top of sidebar):**
- Height: 64px (matches topbar)
- Flex row, gap 12px, padding 0 24px
- Border-bottom: 1px solid `--border`
- **Brand icon**: 36×36px, border-radius 10px, background `linear-gradient(135deg, indigo, violet)`, white monitor icon, box-shadow `0 4px 12px rgba(99,102,241,.3)`
- **Brand text**: "Dashboard Monitor" — 15px, weight 700, Plus Jakarta Sans
- **Brand sub**: "Monitoring & Alerts" — 11px, `--text-dim`

**Navigation (middle, flex-grow):**
- Padding: 16px 12px, overflow-y auto
- **Section label**: "MAIN" — 10px uppercase, `--text-dim`, padding 16px 12px 8px

**Nav links** (each):
- Flex row, gap 12px, padding 10px 12px, border-radius 8px
- Font: 14px, weight 500, `--text-muted`
- Hover: background `--surface-2`, color `--text`
- **Active state**: background `--indigo-soft`, color `--indigo-lt`, left accent bar (3px × 20px, `--indigo`, positioned -12px left, vertically centered)
- Icon: 18px, SVG stroke-based

**Nav items:**
1. **Jobs** (`/`) — jobs icon
2. **WhatsApp** (`/whatsapp`) — whatsapp icon + status dot badge (right-aligned, 6px dot, colored by status: green=connected, amber=awaiting, red=disconnected)
3. **Email** (`/email`) — mail icon
4. **System Health** (`/health`) — heart icon

**Footer (bottom of sidebar):**
- Border-top: 1px solid `--border`
- Padding: 16px 12px
- **User block**: flex row, gap 10px, padding 8px 12px
  - **Avatar**: 32×32px circle, background `linear-gradient(135deg, indigo, violet)`, white text, first letter of email, weight 600
  - **User name**: 13px, weight 600, `--text`, truncated with ellipsis
  - **User email**: 11px, `--text-dim`, truncated with ellipsis
  - **Profile button**: ghost icon button (user icon, 16px)
  - **Logout button**: ghost icon button (logout icon, 16px)

### Topbar (Sticky, Above Content)

- Height: 64px, sticky top: 0, z-index 90
- Background: `rgba(15,17,32,.7)` with `backdrop-filter: blur(16px) saturate(140%)`
- Border-bottom: 1px solid `--border`
- Flex row, gap 16px, padding 0 28px

**Elements (left to right):**
1. **Mobile menu toggle** — only visible <900px, hamburger icon
2. **Page title** — 18px, weight 700, Plus Jakarta Sans, `--text`
3. **Spacer** (flex: 1)
4. **Search bar** — 280px wide, input with left search icon, background `--surface-2`, border-radius 8px, placeholder "Search jobs...", hidden on mobile
5. **Live clock** — pill shape (border-radius 9999px), background `--surface-2`, border 1px `--border`, padding 6px 14px, mono font 12px, shows Malaysia time (DD Mon HH:MM:SS), clock icon 14px, hidden on mobile

### Content Area

- Flex: 1, margin-left: 260px (sidebar width)
- Padding: 28px
- Max-width: 1400px, margin: 0 auto
- `.animate-in` class triggers fadeInUp on page mount

### Mobile (<900px)

- Sidebar slides off-screen, toggled by hamburger
- Overlay: `rgba(0,0,0,.5)` full-screen, z-index 99
- Content margin-left: 0
- Search bar and clock hidden in topbar

---

## 3. Login / Register Page

### Layout: Split Screen (50/50)

Full-height grid: `grid-template-columns: 1fr 1fr`, min-height 100vh, background `--bg`.

### Left Side — Visual/Branding

- Background: `linear-gradient(135deg, #0f1120 0%, #1a1d35 50%, #0f1120 100%)`
- Overlay (pseudo-element): two radial gradients — indigo at 30% 40%, violet at 70% 70%, both at 12-15% opacity
- Flex column, centered, aligned flex-start
- Padding: 64px

**Content (max-width 420px, z-index 1):**
- **Headline** (h2): 32px, weight 800, line-height 1.2, white — "Monitor any website. Get alerted on change."
- **Description** (p): 15px, `--n400` (#7b8095), line-height 1.7, margin-bottom 32px — describes automated screenshot monitoring with AI OCR, Email & WhatsApp notifications
- **Feature list** (4 items, each):
  - Flex row, gap 14px, margin-bottom 18px
  - **Icon box**: 40×40px, border-radius 10px, background `--indigo-soft`, border 1px `rgba(99,102,241,.2)`, indigo icon
  - **Text**: 14px, `--n400`, weight 500
  - Features: "Automated screenshots with precise crop areas", "AI OCR text extraction (Ollama vision LLM)", "Email & WhatsApp notifications on change", "Flexible scheduling — interval or alarm mode"

### Right Side — Form

- Flex center, padding 40px

**Auth card (max-width 400px, fadeInUp animation):**
- **Logo**: 48×48px, border-radius 12px, `linear-gradient(135deg, indigo, violet)`, white monitor icon, box-shadow `--sh-indigo`, margin-bottom 24px
- **Heading** (h1): 24px, weight 800 — "Welcome back" / "Create account"
- **Sub**: 14px, `--text-muted`, margin-bottom 28px — "Sign in to your dashboard" / "Start monitoring in minutes"

**Tab bar (Login/Register toggle):**
- Flex row, background `--surface-2`, border 1px `--border`, border-radius 8px, padding 4px, margin-bottom 24px
- Two buttons, flex: 1, padding 10px, 13px weight 700
- Inactive: `--text-muted`
- Active: background `--surface`, color `--text`, box-shadow `--sh-sm`

**Form fields:**
- Each form-group: label (13px, weight 600, `--text`) + input
- **Input**: padding 11px 14px, border 1px `--border`, border-radius 8px, background `--surface-2`, color `--text`, font-size 14px
- Focus: border-color `--indigo`, box-shadow `0 0 0 3px var(--indigo-soft)`
- Register mode shows: Full Name, Email, Password (min 8 chars)
- Login mode shows: Email, Password

**Error message:**
- Red (#fb7185), 13px, padding 10px 14px, background `rgba(244,63,94,.06)`, border 1px `rgba(244,63,94,.2)`, border-radius 8px, alert icon

**Submit button:**
- Full width, padding 13px, `--indigo` background, white text, weight 600
- Hover: `--indigo-dk`, box-shadow `0 12px 32px rgba(99,102,241,.35)`
- Active: scale(0.98)

**Forgot password link** (login mode only):
- Centered, margin-top 12px, 13px, `--indigo` color, "Forgot password?"

### Mobile (<768px)

- Grid collapses to 1 column
- Visual side hidden (`display: none`)
- Form side padding: 24px

---

## 4. Dashboard Page (Jobs List) — `/`

### Page Header

- Flex row, space-between, margin-bottom 24px
- **Left**: h1 "Monitoring Jobs" (24px, 800) + subtitle "Track website changes and get notified via Email & WhatsApp" (13px, `--text-muted`)
- **Right**: "New Job" button — primary indigo, plus icon

### Stats Row (4 cards)

Grid: `repeat(auto-fit, minmax(180px, 1fr))`, gap 16px, margin-bottom 24px.

**StatCard (premium):**
- Background `--surface`, border 1px `--border`, border-radius 14px, padding 0 (overflow hidden)
- **Decorative SVG** (absolute, right 0, top 0, 60% width, 100% height, pointer-events none): 3 circles with accent color at 5-8% opacity — positioned at (160,40), (180,80), (140,100)
- **Content** (relative, z-index 1, padding 20px):
  - **Icon wrap**: 40×40px, border-radius 10px, background `accent + 15% opacity`, colored icon
  - **Value**: 28px, weight 800, animated count-up (cubic ease, 700ms)
  - **Label**: 11px, uppercase, weight 700, letter-spacing 0.08em, `--text-dim`
- Hover: border `--border-hi`, translateY(-2px), box-shadow `--sh-md`

**4 stats:**
1. Total Jobs — indigo accent (#818cf8), jobs icon
2. Active — green accent (#34d399), play icon
3. Paused — amber accent (#fbbf24), pause icon
4. Failed — red accent (#fb7185), alert icon

### Toolbar (Search + Filter)

- Flex row, gap 12px, margin-bottom 20px
- **Search**: flex 1, max-width 360px, input with left search icon (16px), padding 9px 12px 9px 36px, background `--surface`, border-radius 8px, placeholder "Search by name or URL..."
- **Filter tabs**: flex row, gap 4px, background `--surface`, border 1px `--border`, border-radius 8px, padding 4px
  - 4 tabs: All, Active, Paused, Failed
  - Each: padding 6px 14px, 12px, weight 600
  - Active tab: background `--indigo`, white text
  - Inactive: `--text-muted`, hover: `--text`

### Job Grid

Grid: `repeat(auto-fill, minmax(360px, 1fr))`, gap 16px.

**Job card:**
- Background `--surface`, border 1px `--border`, border-radius 14px, padding 24px
- Box-shadow `--sh`, hover: border `--border-hi`, translateY(-3px), `--sh-md`
- Stagger animation: `fadeInUp` with `animationDelay: idx * 0.05s`
- Paused jobs: opacity 0.6

**Card content (top to bottom):**
1. **Header row**: flex, space-between
   - h2: 15px, weight 700, `--text` (job name)
   - Status badge: pill, 11px, weight 700
     - Active: green bg 10%, #34d399
     - Paused: amber bg 10%, #fbbf24
     - Each badge has 6px dot before text
2. **URL**: 12px, `--text-dim`, monospace, truncated with ellipsis
3. **Schedule**: inline-flex, monospace 11px, padding 4px 10px, background `--surface-2`, border 1px `--border`, border-radius 8px, schedule icon 12px
4. **Meta row**: flex, gap 20px, padding 12px 14px, background `--surface-2`, border-radius 8px, border 1px `--border`
   - Last run: label (10px, uppercase, weight 700, `--text-dim`) + value (12px, monospace, colored by status: green=sent, red=failed, gray=pending) with icon
   - Next run: label + countdown value (12px, monospace, `--indigo-lt`, weight 600, clock icon) — live updating every second
5. **Error** (if any): 11px, #fb7185, padding 8px 12px, background `rgba(244,63,94,.06)`, border 1px `rgba(244,63,94,.15)`, border-radius 8px, alert icon, truncated
6. **Action buttons**: flex, gap 6px, wrap
   - Run (primary, play icon, 13px) — disabled if paused or running
   - History (ghost, history icon)
   - Compare (ghost, compare icon)
   - Edit (ghost, edit icon)
   - Pause/Resume (ghost or success if resuming)
   - Delete (danger, trash icon only)

### Empty State

- Centered, padding 64px 24px
- Floating icon (48px, `--text-dim`, 40% opacity, floatY animation 3s)
- "No monitoring jobs yet." — 15px, `--text-muted`
- "Create your first job" — primary button

---

## 5. Job Form Page (New/Edit) — `/jobs/new` or `/jobs/:id/edit`

### Layout: Two-Column Split

Grid: `420px 1fr`, gap 20px. Collapses to 1 column <1024px.

### Back Link

- "← Back to Jobs" — 13px, `--text-muted`, arrowLeft icon 14px, margin-bottom 16px

### Page Header

- h1 "New Monitoring Job" / "Edit Job" — 24px, weight 800

### Left Column (Form Fields)

**Card 1: Job Details**
- h2 "Job Details" with icon accent
- **Job Name**: text input, placeholder "e.g. TNB Status Monitor"
- **Notification Subject**: text input with small hint "(Custom subject for email & message, leave blank to use Job Name)", placeholder "e.g. GR VERIFY Compliance Status"
- **Target URL**: text input, placeholder "https://...", disabled in multi-URL mode (opacity 0.4)
  - "Capture Screenshot" button below (full width, primary, capture icon) — shows "Capturing Screenshot…" when loading
- **Schedule**: SchedulePicker component (see below)
- **Checkbox**: "Only notify when content changes" — 18px checkbox, accent-color indigo

**Card 2: Multi-URL Monitoring**
- h2 "Multi-URL Monitoring"
- Checkbox: "Enable multi-URL mode (screenshot multiple URLs per run)"
- When enabled:
  - List of items, each with: badge (label), monospace URL (truncated), delete button (×)
  - Input row: label input (max 150px) + URL input + "Add URL" button
  - Hint: "Each URL will be screenshotted and OCR'd. Results are combined into one notification."

**Card 3: Notification Recipients**
- h2 "Notification Recipients"
- List of recipients: each row has badge (email=indigo, whatsapp=green), value text, delete button
- Input row: select dropdown (Email/WhatsApp, max 130px) + value input + "Add" button
  - Email placeholder: "user@example.com"
  - WhatsApp placeholder: "60123456789@s.whatsapp.net"

### Right Column (Crop Selector + Preview)

**Single-URL mode:**
- **Crop Area Selection card** (preview-card style):
  - Header: "Crop Area Selection" label with crop icon + "Drag a box to select region" hint
  - Body: CropSelector canvas (see below) or spinner "Capturing screenshot… (may take 10-15s)"
- **Crop Coordinates card** (shown after preview):
  - h2 "Crop Coordinates"
  - 4 pill values: x, y, w, h (percentages, monospace, indigo-lt text, background `--surface-2`, padding 4px 12px, border-radius 8px)
  - CroppedPreview component

**Multi-URL mode:**
- For each URL item:
  - **Multi-item header**: indigo-soft background, border 1px `rgba(99,102,241,.15)`, border-radius 8px, padding 10px 14px
    - Numbered badge (28px circle, indigo, white, weight 800)
    - Label (14px, weight 700)
    - URL (12px, monospace, `--text-dim`, right-aligned, truncated)
  - Crop Area card with "Preview" button
  - Crop values card + CroppedPreview

### SchedulePicker Component

- **Type tabs**: two buttons "Interval" / "Alarm" — segmented control style (background `--surface-2`, padding 4px, active = indigo bg + white)
- **Interval mode**: "Every [X] [minutes/hours/days]" — number input (64px, centered, monospace) + unit select
- **Alarm mode**: time input (large, 18px monospace, `color-scheme: dark`) + day toggles
  - **Day toggles**: 7 circular buttons (42×42px), letters M/T/W/T/F/S/S
    - Inactive: `--surface-2` bg, `--text-muted`
    - Active: `--indigo` bg, white, scale(1.05), `--sh-indigo`
  - **Quick days**: pill buttons "Weekdays" / "Weekends" / "Daily"
- **Summary bar**: indigo-soft background, border 1px `rgba(99,102,241,.15)`, border-radius 8px, padding 12px 16px — shows human-readable schedule + cron preview (monospace 11px, `--indigo-lt`)

### CropSelector Component

- Canvas wrap: background `--n50`, border-radius 12px, border 1px `--border`, overflow hidden
- Canvas: width 100%, cursor crosshair
- **Fullscreen button**: absolute top-right, `rgba(15,17,32,.85)` bg, backdrop-blur, 12px
- **Empty state**: centered "NO PREVIEW" text (13px, monospace, uppercase, `--indigo-lt`, 50% opacity) + "Capture a screenshot to begin"
- Drag-to-draw crop rectangle overlay
- **Fullscreen mode**: full-screen overlay (z-index 9999), `--n0` background, header bar with title + hint + close button

### CroppedPreview Component

- Label: "CROPPED RESULT PREVIEW" — 11px, uppercase, weight 700, `--indigo-lt`, letter-spacing 0.08em
- Preview box: border 2px dashed `rgba(99,102,241,.2)`, border-radius 14px, min-height 120px, background `--surface-2`
- Canvas inside: max-width 100%, scaleIn animation
- Loading: spinner + text

### Form Actions (Bottom)

- Flex row, gap 10px, justify-end, margin-top 24px
- "Cancel" (ghost button) + "Save Job" (primary, disabled while saving — shows "Saving…")

---

## 6. Job History Page — `/jobs/:id/history`

### Back Link + Header

- "← Back to Jobs"
- h1 "History: [job name]" + URL below (12px, monospace, `--text-muted`)

### Stats Row (3 cards)

Same stat-card style:
1. Total Runs — indigo, history icon
2. Changes Detected — amber (#fbbf24), alert icon
3. Notifications Sent — green (#34d399), mail icon

### History Table

- Wrapped in `.history-table-wrap`: border-radius 14px, border 1px `--border`, background `--surface`, box-shadow `--sh`, overflow-x auto

**Table:**
- **Header (th)**: background `--surface-2`, 11px, uppercase, weight 700, letter-spacing 0.06em, `--text-dim`, padding 12px 16px, border-bottom 1px `--border`
- **Cells (td)**: padding 12px 16px, border-bottom 1px `--border`, 13px, `--text-muted`, vertical-align middle
- Row hover: background `--surface-2`
- Last row: no bottom border

**Columns:**
1. **Screenshot**: 100×56px thumbnail (object-fit cover, border-radius 8px, border 1px `--border`), hover: scale(1.08), `--sh-md`, border-color `--indigo`. Clickable, opens full image in new tab. "—" if no screenshot.
2. **Checked At**: monospace 12px, white-space nowrap
3. **Changed**: badge — "Changed" (amber bg, #fbbf24) or "Same" (gray bg, `--text-dim`)
4. **Delivery**: badge — sent (green), pending (gray), failed (red)
5. **OCR Text**: monospace 11px, `--text-dim`, max-width 220px, truncated with ellipsis
6. **Error**: 12px, #fb7185, max-width 200px, truncated

---

## 7. Compare View Page — `/jobs/:id/compare`

### Back Link + Header

- "← Back to Jobs"
- h1 "Compare: [job name]" + URL

### Run Selectors Card

- h2 "Select Runs to Compare"
- Grid: `1fr 1fr`, gap 16px
- Each selector: label (13px, weight 700) + select dropdown (padding 10px 14px, `--surface-2` bg, border-radius 8px)
  - "Run A (newer)" and "Run B (older)"
  - Options: timestamp + changed/same status

### Side-by-Side Screenshots

Grid: `1fr 1fr`, gap 16px (collapses to 1 column <768px).

**Each compare card:**
- padding 0, overflow hidden, border-radius 14px
- **Header**: flex row, gap 10px, padding 12px 16px, background `--surface-2`, border-bottom 1px `--border`
  - Changed/Same badge
  - Date (12px, monospace, `--text-dim`)
- **Image**: width 100%, display block
- **No image**: 200px height, centered, `--text-dim`, `--n50` background

### OCR Text Comparison

- Card with h2 "OCR Text Comparison"
- Grid: `1fr 1fr`, gap 16px
- Each column:
  - Label: 12px, weight 700, `--text-dim`, padding 6px 10px, background `--surface-2`, border-radius 8px — "Run A — [date]"
  - Text: `<pre>` monospace 12px, `--text-muted`, background `--surface-2`, padding 14px, border-radius 8px, white-space pre-wrap, word-break, min-height 100px, max-height 400px, overflow-y auto, border 1px `--border`

---

## 8. WhatsApp Connection Page — `/whatsapp`

### Layout

- Max-width 600px, centered
- h1 "WhatsApp Connection" — 26px, weight 700
- Description: "Each user connects their own WhatsApp account. Notifications for your jobs will be sent from your linked device." — `--text-muted`, margin-bottom 16px

### WhatsApp Card

- `.card .wa-card` — max-width 500px, padding 24px, border-radius 14px

**Status row:**
- Flex row, gap 14px, margin-bottom 24px
- **Status dot**: 16×16px circle
  - Connected: green (#22c55e), `glowPulse` animation (2s infinite, box-shadow ring expands)
  - Awaiting QR: amber (#f59e0b)
  - Disconnected: red (#ef4444)
  - Connecting: amber
- **Status label**: 18px, weight 700, Plus Jakarta Sans, icon + text — "Connected" / "Waiting for QR Scan" / "Disconnected"

**States:**

1. **Connected**:
   - Green check message: "WhatsApp is connected. Notifications will be delivered automatically."
   - "Disconnect" danger button (power icon)

2. **Awaiting QR (with QR)**:
   - "Scan this QR code with your WhatsApp:" — `--gray-300`
   - **QR image**: max-width 260px, centered, border 1px `--border-hi`, border-radius 18px, box-shadow `--sh-lg`, scaleIn animation
   - **Steps** (ordered list, text-align left, `--text-muted`, 13px, padding-left 24px):
     1. Open WhatsApp on your phone
     2. Tap Menu → Linked Devices
     3. Tap Link a Device
     4. Point your camera at the QR code above

3. **Awaiting QR (no QR yet)**: "QR code is loading…"

4. **Disconnected/Error**:
   - "WhatsApp is not connected. Click Connect to start the pairing process."
   - "Connect" primary button (refresh icon)

---

## 9. Email Settings Page — `/email`

### Layout

- Max-width 600px, centered
- h1 "Email Settings" — 26px, weight 700
- Description: "Configure your own SMTP server. Notifications for your jobs will be sent from your email account."

### Status Banner (if configured)

- Card, flex row, gap 12px, padding 16px
- Status dot (10px): green if verified, amber if not
- SMTP user (white, weight 600) + host:port — verified/not verified label

### Settings Form Card

- padding 20px

**Fields:**
1. **Provider** — select dropdown with presets: Gmail, Outlook, Yahoo, Hostinger, Zoho, Custom
   - Selecting a preset auto-fills host + port + TLS
2. **SMTP Host** — text input, placeholder "smtp.gmail.com"
3. **Port** (flex 1) + **Use TLS** (flex 1, checkbox) — side by side
4. **Username** — text input, placeholder "your@email.com"
5. **Password** — password input, placeholder changes if editing ("••••••••" with hint "leave blank to keep current")
   - Gmail hint: "Gmail requires an App Password (not your account password)" with link to Google App Passwords
6. **From Address** — text input, placeholder "alerts@yourdomain.com"

**Buttons (flex row, wrap, gap 8px):**
- "Save" — primary, check icon
- "Verify Connection" — secondary, refresh icon (only if already configured)
- "Remove" — danger, trash icon (only if already configured)

**Feedback messages:**
- Error: red bg 20%, red text, border-radius 8px, padding 10px
- Success: green bg 20%, green text

---

## 10. System Health Page — `/health`

### Layout

- Max-width 700px, centered
- h1 "System Health" — 26px, weight 700

### Overall Status Banner

- Card, margin-bottom 20px, border-color tinted by overall status
- Flex row, gap 16px
- **Status circle**: 48×48px, border-radius 50%, background `color + 20%`, border 2px solid color, centered icon (24px)
  - OK: green (#22c55e)
  - Warning: amber (#f59e0b)
  - Error: red (#ef4444)
- **Text**: "System Status: OK/Warning/Error" (20px, weight 600, white) + "[N] components checked · auto-refresh every 15s" (`--text-muted`)

### Individual Check Cards

- Flex column, gap 12px

**Each check card:**
- Card, padding 16px 20px, border-color `color + 25%`
- **Left accent bar**: 3px wide, full height, colored by status (using `::after` pseudo)
- Flex row, gap 14px:
  - **Icon circle**: 36×36px, border-radius 50%, background `color + 15%`, border 1.5px solid color, icon 16px
    - OK status: box-shadow `0 0 12px color + 40%` (glow)
  - **Content**: label (14px, weight 600, white) + detail (12px, monospace, `--text-muted`)
  - **Badge**: right-aligned — OK (green), Warning (amber), Error (red)

**7 checks:**
1. MySQL Database
2. WhatsApp (Baileys) — per-user status
3. Email SMTP (yours) — per-user SMTP config
4. Playwright (Screenshot)
5. Data Directory
6. Scheduler (node-cron)
7. Ollama OCR

---

## 11. Profile Page — `/profile`

### Layout

- Max-width 720px, centered
- h1 "Profile" — 26px, weight 700

### Account Info Card

- h2 "Account"
- Grid: `1fr 1fr`, gap 16px
- **Fields** (label 12px `--text-dim` + value 15px white):
  - User ID (#1)
  - Email
  - Role (Admin/User)
  - Member since (formatted date)
  - Last login (formatted date)
  - Last login IP (masked: `XX.XX.***.XXX`)
  - Email verified (Yes/No — No highlighted amber)

**Email not verified warning:**
- Amber bg 20%, border 1px amber 40%, border-radius 8px, padding 12px
- "Email not verified" with alert icon
- Hint: "Configure your SMTP in Email Settings first"
- "Resend verification email" secondary button

### Display Name Card

- h2 "Display Name"
- Flex row, gap 8px: text input (flex 1, max 100 chars) + "Save" primary button

### Change Password Card

- h2 "Change Password"
- Grid: `1fr 1fr`, gap 12px: Current password + New password (min 8 chars)
- "Change Password" primary button

### Login History Card

- h2 "Recent Login Activity"
- Table (full width, 13px):
  - **Header**: When, Status, IP, Device — `--text-dim`, left-aligned, padding 6px
  - **Rows**: border-top 1px `#334155`
    - When: formatted date, `--gray-300`
    - Status: "Success" (green) / "Failed" (red)
    - IP: masked, `--gray-400`
    - Device: user-agent truncated to 50 chars, `--gray-500`, 11px

### Logout Button

- Centered, ghost button, logout icon

---

## 12. Auth Flow Pages

### Forgot Password Page — `/forgot-password`

- Centered auth-card (same style as login right side)
- Key icon (32px) in auth-icon container
- h1 "Forgot Password"
- Description: "Enter your email and we'll send you a reset link."
- Email input + "Send Reset Link" primary button (full width)
- Success: green box "If an account exists, a reset link has been sent to [email]" with note about SMTP
- "← Back to Login" link

### Reset Password Page — `/reset-password`

- Lock icon
- h1 "Set New Password"
- Two password inputs: New password + Confirm password
- "Reset Password" button
- Success: green box "Password reset! Redirecting to login…" (auto-redirect after 3s)

### Verify Email Page — `/verify-email?token=xxx`

- Centered card
- Icon: check (green) / x (red) / refresh (while verifying)
- h1 "Email Verified" / "Verification Failed"
- Description + "Back to Login" button

---

## 13. Recurring Component Patterns

### Badge

- Pill shape (border-radius 9999px), padding 3px 10px, 11px, weight 700
- 6px dot before text (currentColor)
- Variants: active (green), paused (amber), email (indigo), whatsapp (green), changed (amber), same (gray), sent (green), pending (gray), failed (red)

### Button

- Flex inline, center, gap 8px
- Padding 10px 18px, border-radius 8px, 13px, weight 600, Plus Jakarta Sans
- Variants:
  - **Primary**: indigo bg, white, `--sh-indigo`, hover: indigo-dk
  - **Secondary/Ghost**: `--surface-2` bg, `--text-muted`, hover: `--surface-3`
  - **Danger**: `rgba(244,63,94,.1)` bg, #fb7185, hover: solid red
  - **Success**: `rgba(16,185,129,.12)` bg, #34d399, hover: solid green
- Sizes: sm (7px 12px, 12px), block (100% width)
- Disabled: opacity 0.4
- Active: scale(0.98)

### Card

- Background `--surface`, border 1px `--border`, border-radius 14px, padding 24px
- Box-shadow `--sh`, hover: border `--border-hi`
- Margin-bottom 16px

### Input

- Padding 11px 14px, border 1px `--border`, border-radius 8px
- Background `--surface-2`, color `--text`, 14px
- Focus: border `--indigo`, box-shadow `0 0 0 3px var(--indigo-soft)`
- Placeholder: `--text-dim`

### Loading State

- Centered, padding 80px, flex column, gap 16px
- Text: 15px, `--text-dim`
- Spinner: 32px circle, 3px border, indigo-soft / indigo top, spin 1s

### Empty State

- Centered, padding 64px 24px
- Icon: 48px, `--text-dim`, 40% opacity, floatY animation
- Message: 15px, `--text-muted`
- CTA button

---

## 14. Icon System

All icons are inline SVG, stroke-based, 24×24 viewport, consistent stroke width.
Icon component: `<Icon name="monitor" size={20} />`

**Available icons:**
monitor, clock, whatsapp, mail, heart, jobs, search, schedule, play, pause, plus, capture, crop, compare, edit, history, trash, user, key, lock, alert, check, x, circle, refresh, power, arrowLeft, logout, clipboard

---

## 15. Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| <1024px | Job form split collapses to 1 column |
| <900px | Sidebar slides off, hamburger toggle, search + clock hidden |
| <768px | Auth page visual side hidden, compare grid collapses |

---

## 16. Key Design Principles

1. **Dark premium** — deep dark backgrounds (#0a0b14), not pure black
2. **Indigo as primary** — all interactive elements use indigo (#6366f1), not blue
3. **Subtle borders** — `rgba(255,255,255,.06)` barely visible, elevates on hover
4. **Soft shadows** — multi-layer shadows with low opacity, never harsh
5. **Glassmorphism topbar** — `backdrop-filter: blur(16px) saturate(140%)`
6. **Micro-interactions** — hover transforms (translateY -2px), scale on active, glow on connected status
7. **Monospace for data** — URLs, cron, timestamps, OCR text all in JetBrains Mono
8. **Pill badges** — status indicators are always pills with a colored dot
9. **Gradient brand** — `linear-gradient(135deg, indigo, violet)` for logo, avatar, brand icon
10. **Staggered animations** — list items fade in with incremental delay (0.05s per item)