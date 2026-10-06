---
name: Kisan B2B Commerce
colors:
  surface: '#faf9fd'
  surface-dim: '#dbd9dd'
  surface-bright: '#faf9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#efedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1b1e'
  on-surface-variant: '#554336'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#887364'
  outline-variant: '#dbc2b0'
  surface-tint: '#914d00'
  primary: '#914d00'
  on-primary: '#ffffff'
  primary-container: '#f28c28'
  on-primary-container: '#5d2f00'
  inverse-primary: '#ffb77d'
  secondary: '#006d38'
  on-secondary: '#ffffff'
  secondary-container: '#8ff9ad'
  on-secondary-container: '#00743c'
  tertiary: '#325ea0'
  on-tertiary: '#ffffff'
  tertiary-container: '#7da6ed'
  on-tertiary-container: '#003a78'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#8ff9ad'
  secondary-fixed-dim: '#72dc93'
  on-secondary-fixed: '#00210d'
  on-secondary-fixed-variant: '#005229'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#aac7ff'
  on-tertiary-fixed: '#001b3e'
  on-tertiary-fixed-variant: '#124687'
  background: '#faf9fd'
  on-background: '#1a1b1e'
  surface-variant: '#e3e2e6'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The brand targets dairy farmers, village stockists, and agricultural feed dealers who operate under demanding real-world conditions: outdoor sunlight, varying literacy levels, bilingual workflows (Hindi/English), and fast turnaround daily transactions.

The design philosophy combines **Tactile Utilitarianism** and **Clean Commercial Modernity**:
- **Clarity over ornamentation**: Critical information—bag counts, net weight in quintals/kilograms, delivery ETAs, and credit/cash prices—must be instantly parseable at a glance.
- **Physical confidence**: Touch points feel solid, large, and responsive. Steppers, wholesale selectors, and quick-reorder buttons evoke the dependability of physical retail ledgers rather than abstract consumer software.
- **Culturally resonant yet professional**: The aesthetic balances warm auspicious tones (Saffron, Warm White) with disciplined commercial anchors (Deep Charcoal, Ashoka Navy, India Green). It avoids bureaucratic or political tropes, operating as an efficient trade engine built to drive rural enterprise prosperity.

## Colors

The application operates in a dedicated high-contrast light mode optimized for outdoor screen visibility and dusty daylight environments.

### Palette Hierarchy & Ratios
- **Base Canvas (75%)**: `#FFFDF8` (Warm White) provides a glare-reducing, eye-friendly backdrop, supported by `#FFFFFF` for primary elevated cards and sheets.
- **Primary Accent (20%)**: `#F28C28` (Saffron) leads core navigation, category badges, order placement highlights, and primary actionable highlights.
- **Commerce & Confirmation**: `#138A4B` (India Green) indicates completed dispatches, payment receipts, in-stock availability, and positive ledger balances. `#25D366` is reserved strictly for native WhatsApp order sharing, support, and invoice dispatching.
- **Utility & Structure**: `#1A4B8C` (Ashoka Navy) acts as an institutional anchor for invoice badges, credit facility terms, and verified dealer tags.
- **Text & Contrast**: `#202124` (Deep Charcoal) is applied across all primary labels and numerical values to maintain maximum legibility against light surfaces.
- **Borders & Separation**: `#E8E2D8` provides grounding structure across cards, tables, and stepper units without visual vibration.
- **Critical Alerts**: `#D93025` identifies overdue balances, payment failures, stock exhaustion, and critical order cancellations.

## Typography

**Plus Jakarta Sans** is the primary typeface across all roles. Its geometric foundation, open apertures, and wide counters provide optical stability, rendering clearly in dual Hindi and English interfaces even under reduced backlighting.

### Rules of Usage
- **Numerals First**: Price values, quantity bags, and weight totals must use `title-lg` or `headline-sm` with `fontWeight: 700` and tabular figures (`tnum`) enabled to prevent misreading order quantities.
- **No Light Weights**: Weights under `400` are prohibited across the system to protect contrast outdoors.
- **Compact Vertical Rhythm**: Generous line heights are maintained on running body text (`1.5`), while headlines and numeric metrics maintain tighter line heights (`1.2` - `1.3`) for dense multi-line product titles.

## Layout & Spacing

The layout model is built around mobile-first utility, serving high-density inventory data while keeping tap zones wide and forgiving for one-handed operation.

### Grid & Margins
- **Mobile Grid**: 4 columns with `1rem` (16px) margins and `1rem` (16px) gutters.
- **Tablet / Large Handhelds**: 8 columns with `1.5rem` (24px) margins and `1rem` (16px) gutters for multi-pane order books.
- **Container Hierarchy**: Feed catalog items sit within structured list cards or 2-column inventory grids. Horizontal scrolling is restricted to brand categories, quick-reorder chips, and active truck tracking summaries.
- **Safe Tap Bounds**: All interactive elements maintain a minimum touch target area of 48×48px. Primary transaction bars sit anchored to the bottom viewport with a persistent 54px hit-box and device safe-area inset accommodations.

## Elevation & Depth

To guarantee structural visibility in glare-heavy outdoor contexts, visual hierarchy uses **Tonal Layering combined with Low-Contrast Outlines** instead of diffuse, low-contrast shadows.

### Depth Levels
- **Canvas Base (`#FFFDF8`)**: Level 0 foundation.
- **Surface Cards (`#FFFFFF`)**: Level 1 items. Each surface uses an explicit `1px solid #E8E2D8` structural border. Ambient shadow is crisp and close: `0px 2px 4px rgba(32, 33, 36, 0.04)`.
- **Active Orders & Floating Bottom Bars**: Level 2 elevation. Surrounded by `1px solid #E8E2D8` with a directional upward shadow: `0px -4px 12px rgba(32, 33, 36, 0.08)`.
- **Modals, Truck Dispatch Drawers & Quantity Pickers**: Level 3 elevation. Surrounded by a `1px solid #E8E2D8` border with backdrop scrim at `rgba(32, 33, 36, 0.5)`.

## Shapes

The interface balances modern friendliness with industrial stability:
- **Cards & Data Modules**: Base `12px` to `16px` border radius (`rounded-lg`), creating distinct containers that bundle product visuals, pricing, and bag-selection steppers.
- **Buttons & Input Fields**: `8px` to `12px` border radius (`rounded`), preserving rectangular affordances that look reliably tappable.
- **Status Tags & Quick Filters**: Fully pill-shaped (`rounded-full` / `9999px`) to immediately distinguish actionable tags from standard content containers.

## Components

### Buttons
- **Primary CTA (Place Order / Confirm Truckload)**: Minimum height 54px. Background `#F28C28`, text `#FFFFFF`, bold `label-lg`. Active tap scale `0.98`. Full-width pinned variant for bottom mobile sheets.
- **Secondary Action (Request Quote / View Ledger)**: Minimum height 48px. Background `#FFFFFF`, border `2px solid #F28C28`, text `#F28C28`.
- **WhatsApp Integration CTA**: Minimum height 48px. Background `#25D366`, text `#FFFFFF`, accompanied by standard messaging icon. Used exclusively for "Share Order on WhatsApp" and "Talk to Mill Dealer".
- **Success / Payment Action**: Minimum height 48px. Background `#138A4B`, text `#FFFFFF`.

### Quantity Stepper (Wholesale Bags / Metric Tonnes)
- Dual-action tap controller: Large `+` and `−` targets (minimum 44×44px hit-box) encased in `#FFFFFF` with `#E8E2D8` borders.
- Center indicator displays current bag count and total tonnage equivalent (e.g., "50 Bags (2.5 MT)") in `title-md` (`#202124`).

### Input Fields & Search
- Height 52px. Background `#FFFFFF`, border `1.5px solid #E8E2D8`, radius 8px.
- Focus state: Border transitions to `#F28C28` with an inner halo.
- Includes persistent Hindi/English bilingual placeholder text (e.g., "Search cattle feed, chana churi, khal / दाना खोजें").
- Micro-action clear (`×`) and voice search mic icons measure 48×48px clickable area.

### Feed Product Cards
- Elevated `#FFFFFF` card with `1px solid #E8E2D8` border and 14px radius.
- Contains: Product bag photo (80×80px minimum), Brand Badge, Protein/Fat percentage pills, Tiered wholesale pricing (e.g., "₹1,450/bag for 50+ bags"), and an inline Quantity Stepper.

### Status Chips & Badges
- **In Stock / Dispatch Ready**: Background `#E7F4EC`, text `#138A4B`, border `1px solid #C3E6D0`.
- **Credit Balance / Ledger Due**: Background `#FCE8E6`, text `#D93025`, border `1px solid #F7C1BC`.
- **Verified Mill / Premium Grade**: Background `#EAF0F9`, text `#1A4B8C`, border `1px solid #C7D8F0`.

### Selection Controls (Checkboxes & Radios)
- Minimum dimension 24×24px, embedded within a 48×48px tap container.
- Selected state: `#138A4B` (India Green) with crisp white glyph. Inactive: `2px solid #E8E2D8`.