---
name: Obsidian Flux
colors:
  surface: '#0f1120'
  surface-dim: '#12131c'
  surface-bright: '#383843'
  surface-container-lowest: '#0d0e17'
  surface-container-low: '#1a1b24'
  surface-container: '#1e1f29'
  surface-container-high: '#282933'
  surface-container-highest: '#33343e'
  on-surface: '#e3e1ef'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e3e1ef'
  inverse-on-surface: '#2f303a'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#12131c'
  on-background: '#e3e1ef'
  surface-variant: '#33343e'
  surface-elevated: '#161827'
  surface-interactive: '#1c1f30'
  border-subtle: rgba(255, 255, 255, 0.06)
  border-bold: rgba(255, 255, 255, 0.1)
  text-primary: '#e8eaf2'
  text-muted: '#7b8095'
  text-dim: '#9ca0b3'
  success: '#10b981'
  warning: '#f59e0b'
  danger: '#f43f5e'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 22px
  body-sm:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  data-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
  mono-technical:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  sidebar-link:
    fontFamily: DM Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 260px
  topbar-height: 64px
  content-padding: 28px
  card-padding: 24px
  grid-gap: 16px
  form-gutter: 18px
  unit-base: 8px
  unit-tight: 4px
---

## Brand & Style

The design system embodies a **Dark Premium SaaS** aesthetic, tailored for high-performance dashboard monitoring and technical analysis. The personality is professional, sophisticated, and authoritative, evoking a sense of deep-tech security and precision.

The visual style is a fusion of **Modern Corporate** and **Glassmorphism**. It utilizes a "Deepest Dark" foundation where depth is not created by value shifts alone, but through layered translucency, backdrop blurs, and meticulous border treatments. 

**Key Stylistic Pillars:**
- **Technical Precision:** Use of monospaced fonts for data ensures clarity and a developer-centric feel.
- **Luminous Accents:** Indigo and violet gradients provide a high-contrast "glow" against the midnight base, guiding the user's eye to primary actions.
- **Glassmorphic Depth:** Topbars and overlays use high-saturation blurs to maintain context while isolating interactive layers.
- **Tactile Feedback:** Subtle micro-interactions, such as scale-downs on click and vertical lifts on hover, provide a high-end, responsive feel.

## Colors

The color palette is anchored in a specialized dark-mode spectrum. The base background (`#0a0b14`) is a "Deepest Dark" indigo-tinted black, providing maximum contrast for vibrant accents.

**Functional Color Application:**
- **Primary (Indigo):** Used for primary actions, focus states, and brand-critical elements.
- **Secondary (Violet):** Used exclusively for decorative gradients, avatars, and brand flourishes to add a premium "tech" feel.
- **Surface Hierarchy:** 
    - `surface` is the standard card and sidebar background.
    - `surface-elevated` is used for internal nesting like table headers and inputs.
    - `surface-interactive` is reserved for hover states on secondary elements.
- **Transparency-Based Borders:** Borders must use `rgba` values to allow the underlying deep colors to bleed through, maintaining the glassmorphic aesthetic.

## Typography

This design system uses a specialized three-font stack to create a clear informational hierarchy:

1.  **Plus Jakarta Sans (Headings/Hero Data):** High-impact and modern. Used for page titles and large "Stat Value" numbers. Tight letter-spacing is essential for the "Premium" look.
2.  **DM Sans (Interface/Body):** Optimized for readability in high-density environments. Used for descriptions, labels, and secondary navigation.
3.  **JetBrains Mono (Technical Data):** Used for URLs, timestamps, code snippets, and logs. This font signals technical reliability.

**Mobile Scaling:**
On mobile devices, `h1` should scale down to 20px. Stat values should scale from 28px to 24px to ensure grid integrity.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. 
- The **Sidebar** is fixed at 260px for consistent navigation access.
- The **Main Content Area** is fluid but capped at a `max-width` of 1400px to ensure data readability on ultra-wide monitors.
- **Topbars** are sticky and utilize backdrop filters to create a glass-like layering effect over scrolling content.

**Grid Philosophy:**
We use an 8px base rhythm. Content is organized into cards using a 16px gap. Large-scale dashboard views typically utilize a 12-column grid, with stat cards spanning 3 columns on desktop (4 per row) and 6 or 12 columns on smaller viewports.

**Responsive Breakpoints:**
- **Desktop:** 1200px+ (Standard 12-col grid).
- **Tablet:** 768px - 1199px (Sidebar collapses to icon-only, padding reduces to 20px).
- **Mobile:** <767px (Sidebar becomes a hidden drawer, content padding reduces to 16px, cards stack vertically).

## Elevation & Depth

Elevation in this system is achieved through **Tonal Layering** and **Ambient Shadows** rather than traditional skeuomorphism. 

**Layering Rules:**
1.  **Level 0 (Background):** `#0a0b14` (The base).
2.  **Level 1 (Surfaces):** `#0f1120` (Cards, Sidebar). These elements use a `1px` subtle border and a soft shadow (`0 2px 8px rgba(0,0,0,.18)`).
3.  **Level 2 (Interaction/Floating):** When a card is hovered or a modal appears, it uses a higher-intensity shadow (`0 8px 24px rgba(0,0,0,.25)`) and shifts `2px` upward.

**Shadow Character:**
Shadows should be "clean" and low-opacity. Primary buttons and brand elements use a **tinted shadow** (Indigo shadow) to create a glowing effect against the dark background.

**Glassmorphism:**
The topbar and any dropdown menus must use a `backdrop-filter: blur(16px) saturate(140%)` with a semi-transparent surface fill (`rgba(15, 17, 32, 0.7)`).

## Shapes

The shape language is defined by **Rounded Precision**. We avoid sharp corners to maintain a sophisticated and modern feel, while avoiding "bubbly" extremes to preserve a professional technical tone.

- **Standard Radius (12px):** Used for the primary "Canvas" wraps and containers.
- **Card Radius (14px):** Used for main dashboard cards and table containers to provide a slightly softer framing.
- **Interactive Radius (8px):** Used for smaller elements like buttons, inputs, and navigation links.
- **Pill (Full):** Used for status badges, tags, and "active" indicators.

Decorative elements, such as the Stat Card background circles, should use low-opacity strokes and circular geometries to contrast against the rectangular grid.

## Components

### Buttons
- **Primary:** Gradient fill (Indigo to Violet), 8px radius, white text. On click, apply a `scale(0.98)` transform.
- **Secondary/Ghost:** `surface-3` background on hover, `border-subtle` stroke, 8px radius.

### Stat Cards
Stat cards are the heart of the dashboard. They must include:
- A `data-display` value.
- A `label-caps` subtitle.
- A decorative, absolute-positioned SVG background (e.g., 3 overlapping circles at 3% opacity).
- A 3px left-accent bar in the relevant status color (Indigo, Success, or Warning).

### Pill Badges
Used for status (e.g., "Active", "Pending").
- **Style:** Fully rounded (pill), subtle background tint of the status color, and a high-saturation "status dot" (glowPulse animation for "Active" states).

### Input Fields
- **Background:** `surface-2`.
- **Border:** `border-subtle`, transitioning to `border-bold` or `indigo` on focus.
- **Text:** `text-primary` for input, `text-dim` for placeholders.

### Lists & Tables
- **Table Headers:** `surface-2` background with `sidebar-link` typography.
- **Rows:** Divided by 1px `border-subtle`. Hovering a row should transition the background to `surface-interactive`.

### Topbar
- Glassmorphic finish (blur + transparency).
- Bottom border of `border-subtle`.
- Height: 64px.