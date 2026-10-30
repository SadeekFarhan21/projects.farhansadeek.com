# SiloFlight — Visual Design

SiloFlight ships in two surfaces with a shared brand but distinct chromes:

1. **App** (mobile-first) — the current Next.js implementation. A clean monochrome flight log with a fixed bottom tab bar.
2. **Website** (desktop) — a darker, glassier "command-center" experience. Sidebar navigation, expanded data-rich rows, and rich visualizations (world map, donut, etc.) for power users.

Both share the same wordmark, the same Geist typeface, and the same blue/emerald accent vocabulary; the website leans much harder into glow, gradients, and information density, while the app stays calm and content-first.

---

## Part 1 — Shared foundations

### Brand mark
A capital **S** glyph rendered as a soft, rounded indigo-to-sky-blue gradient swoosh, paired with the wordmark **SiloFlight** in white Geist Sans semi-bold. On the website, the mark sits at the top of the sidebar with a faint inner glow; on the app, the wordmark is implicit (only the page title appears).

### Typography
- **Sans:** Geist Sans for everything UI.
- **Mono:** Geist Mono for inline `<code>` (e.g. `DATABASE_URL`).
- Big numbers are tracked tight (`tracking-tight`) and use `font-semibold`. IATA codes get the largest treatment available in their context.

### Accent vocabulary
- **Sky/Blue 300–500** — the primary "active / route / data" color. Used for the active nav pill, route arcs, In-Air pills, info bars, and the brand swoosh.
- **Emerald 400–500** — confirmation/success: the "Landed" status pill on the website, the floating "+" FAB on the app.
- **Rose 400** — bar fills on year-over-year charts.
- **Amber / Red 50/200/900** — non-blocking notices and error banners (shared between surfaces).

### Shape language
Rounded-2xl/3xl corners on every card, hairline 1px borders, generous padding. Everything is a card.

---

## Part 2 — Mobile app

The app is what's currently built in `src/app/**`. It's mobile-first and runs comfortably on desktop too, but the chrome is unmistakably native-app.

### Color
Light or dark mode, driven by `prefers-color-scheme`. Built almost entirely from Tailwind's **zinc** ramp:

| Role | Light | Dark |
|---|---|---|
| Page background | `bg-zinc-50` | `bg-black` |
| Card surface | `bg-white` | `bg-zinc-950` |
| Card border | `border-zinc-200` | `border-zinc-800` |
| Primary text | `text-zinc-950` | `text-zinc-50` |
| Secondary text | `text-zinc-500` | `text-zinc-400` |
| Primary button | `bg-zinc-950 text-white` | `bg-zinc-50 text-zinc-950` |

### Layout
A single centered column, `max-w-2xl mx-auto`, padded `px-4 pt-10 pb-6`. The body adds `pb-20` to clear the fixed bottom nav.

### Bottom navigation (`BottomNav`)
A fixed three-tab bar pinned to the bottom (`fixed inset-x-0 bottom-0 z-30`). 1px top border, white-with-blur or zinc-950-with-blur backdrop. Three equal-width tabs — **Flights** (globe), **Statistics** (bars), **More** (user) — each a column of icon-over-label. The active tab gets a filled circular pill behind its glyph (`bg-zinc-900` light / `bg-zinc-50` dark) and full-contrast text. Icons are inline 16×16 SVGs with 2px stroke.

### Floating Add button (`AddFlightFab`)
56×56 emerald-500 square, `rounded-2xl`, fixed `bottom-24 right-6`. Single thin "+" glyph in white. Soft `shadow-emerald-500/30`, gentle `hover:scale-105`. Tapping opens a bottom-sheet modal (`rounded-3xl`) on mobile and a centered modal on `sm:` breakpoints, dimmed `bg-black/50` backdrop.

### Flights page (`/`)
Header: large "Flights" title on the left, faint zinc-500 count on the right ("3 flights"). States: setup notice (amber), sign-in prompt, dashed empty state, or a stack of `FlightCardRow`s (`space-y-3`).

**Flight card row.** Rounded-2xl white/zinc-950 card with:
- Meta header (`text-xs text-zinc-500`) — date + scheduled time on the left, airline name in zinc-700 on the right.
- Body row, three columns: `IATA | route line | IATA`. Each IATA is `text-2xl font-semibold tracking-tight` with a truncated airport name in `text-xs text-zinc-500` underneath. The middle is a small filled dot, a hairline, and a filled airplane SVG glyph — all in `text-zinc-400` so it reads as ornament.

**Lookup form (modal).** Grid form: flight number (placeholder `AA100`), date (default today), and a black/white primary `Look up` button that toggles to "Looking up…" while pending. Borders flip to zinc-950 on focus instead of using a focus ring.

**Lookup result card.** Eyebrow with airline name; 2xl flight number + dim date; status pill (zinc) and optional amber "mock data" pill. A 10:7 embedded **3D globe** (see below). Two-column `Departure | Arrival` block with Scheduled / Estimated / Terminal / Gate / Baggage. Optional aircraft footer.

**3D Flight Globe.** `react-globe.gl` with photographic earth + topology bump map, sky-300 atmosphere, a sky-200 great-circle arc, two raised endpoint dots. Camera auto-frames the route by computing the great-circle midpoint and setting altitude proportional to angular distance, with a 1.2s ease-in.

### Statistics page (`/statistics`)
Same container chrome and "Statistics" h1. A vertical stack of cards:

1. **Top stat row** — 2-col grid of `BigStat` tiles (Flights / Miles, with "N× around the world" sub).
2. **Time in the air** — "Xh Ym" headline, days sub.
3. **Distance** — total miles + two thin progress bars (around the world capped at 5×, to the moon).
4. **Longest & shortest** — `IATA → IATA` route, date, mileage on the right.
5. **Flights by year** — vertical rose-400 bar chart.
6. **Top airlines / airports / countries / routes** — `BarList`s in blue / blue / emerald / rose.

### More page (`/more`)
Account card (configure DB hint, signed-in row with avatar+sign-out, or Continue-with-GitHub button) and an About card.

---

## Part 3 — Website (desktop)

The website is a **dark-only**, full-bleed, dashboard-style experience. It uses a fixed left sidebar instead of a bottom tab bar, denser cards, and richer visualizations. The vibe is "operations console" — deep navy/black field, glassmorphic cards with very subtle inner glows, and tasteful blue light leaks behind the active nav item.

### Foundations (web)

**Color**

| Role | Token / hex |
|---|---|
| Page background | near-black with a faint blue cast — `#05060a` to `#0a0d14` |
| Card surface | translucent dark navy — `bg-slate-900/60` over the page bg |
| Card border | very faint white — `border-white/5` to `border-white/10` |
| Inner card glow | radial blue, very low opacity (`shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)]` plus a soft outer `shadow-blue-500/5`) |
| Primary text | white / `text-zinc-50` |
| Secondary text | `text-zinc-400` |
| Tertiary / muted | `text-zinc-500` |
| Accent — active / data | sky-400 to blue-500 gradient |
| Accent — Landed | emerald-400 with low-opacity emerald-500 fill |
| Accent — In Air | sky-400 with low-opacity sky-500 fill |

**Typography (web)**
- Page titles like "Flights" or "Advanced Flight Insights & Stats" are `text-3xl`–`text-4xl` font-semibold white.
- Card eyebrows (e.g. "TOTAL FLIGHTS") use a small uppercase, wide-tracked, zinc-500 label.
- Hero numbers (e.g. "16,876") run `text-5xl`+ `font-semibold tracking-tight` in white.
- IATA codes on flight rows are even bigger — `text-6xl`/`text-7xl` `font-semibold tracking-tight` — and dominate the row.

**Shape & elevation (web)**
- Cards: `rounded-2xl` with the translucent navy fill, a 1px `border-white/5`, and a *very soft* inner top-edge highlight that reads as a glass bevel.
- Hovered/active cards pick up a faint sky-500 outer halo.
- Sidebar nav active state: sky-blue gradient pill with a stronger right-edge glow (suggests the item is "lit from behind").

### Sidebar (left rail, ~240–260px)

Fixed full-height column, near-black field with subtle vertical light leak.

- **Top:** brand mark (S swoosh) + "SiloFlight" wordmark, padded ~32px from the top.
- **Nav items** (vertical list, ~16px gap):
  - **Flights** — paper-airplane icon + label.
  - **Statistics** — bar-chart icon + label.
  - **More** — three-dots / overflow icon + label.
  - Each item: `rounded-xl` row, ~12px vertical padding. Inactive: `text-zinc-400` with no background. Active: a sky-400/blue-500 gradient fill with `text-zinc-50`, a faint inner-top highlight, and a glowing right edge (`shadow-[inset_-2px_0_0_rgb(96_165_250)]` plus a soft outer `shadow-sky-500/20`).
- **Bottom:** **User Profile** row — circular avatar (32px) and the user's name in white. Pinned to the bottom of the sidebar.

### Top controls bar (Flights view)

Sits above the flight list, full-width inside the main column.

- **Search input** — full-width, `rounded-xl`, dark glass surface (`bg-white/5`), 1px white-5 border, leading magnifying-glass icon in zinc-500, placeholder "Search flights…".
- **Filter button** — same glass surface, leading funnel icon, label "Filter".
- **Date Range button** — same glass surface, leading calendar icon, label "Date Range", trailing chevron-down. Right-aligned.

All three live in a single row (`flex gap-3`); the search grows (`flex-1`).

### Flights list rows

Each flight is a single full-width `rounded-2xl` glass card, much wider than the app's card. Inside, a horizontal layout from left to right:

1. **Meta header** (top of the card, full-width row, `text-sm text-zinc-400`):
   - `May 4, 2026 | 08:55 PM` on the left.
   - **Status pill** immediately to its right — soft rounded-full pill, 12–14px text.
     - **Landed** — emerald-400 text on `bg-emerald-500/10` fill, faint emerald border.
     - **In Air** — sky-400 text on `bg-sky-500/15` fill, faint sky border.
     - Other statuses (Scheduled, Cancelled) get matching neutral / red treatments.
2. **Body row** (the dominant block, ~80px tall):
   - **Departure block** — huge IATA (e.g. `SEA`, `text-6xl/7xl font-semibold` white) with the airport name (`Seattle-Tacoma`, `text-sm text-zinc-400`) directly underneath.
   - **Route indicator** — a horizontal element spanning the gap: a thin sky-300 solid line that fades into a sky-300 plane glyph mid-line, then continues as a dashed line of the same color into the arrival side. Subtle glow on the line.
   - **Arrival block** — mirror of departure (`ANC` / `Anchorage`).
   - **Vertical hairline divider** (`border-l border-white/10`) — visually segments the IATA pair from the next column.
   - **Airline / flight column** — airline name in white semi-bold (`Alaska Airlines`), flight code on the next line in zinc-300 (`AS 67`), and gate/terminal in zinc-500 (`Gate A12, Terminal 1`).
   - **Vertical hairline divider** again.
   - **Time / distance column** — duration on top (`3h 45m`, white), distance below (`1,448 mi`, zinc-300), right-aligned.
   - **Mini route map** — a small `~120×90` rounded-xl thumbnail on the far right showing a simplified darkened world map with the actual flight arc drawn on top in soft white/sky, two glowing dots at the endpoints.

Cards stack vertically with `gap-4`. On hover, the card border brightens to `border-white/10` and a faint sky-500/10 outer glow appears.

### Statistics dashboard (`/statistics`, web)

Title at the top: **"Advanced Flight Insights & Stats"** in `text-3xl` font-semibold white.

The page is a 3-column grid (`grid-cols-12`) with cards spanning different widths. Vertical rhythm is 16–20px between cards.

**Row 1 — three top stat cards (each `col-span-4`):**

- **TOTAL FLIGHTS** — uppercase eyebrow (zinc-500). A massive number in white (`text-6xl`). Sub-line "Flights" in zinc-400. A small paper-airplane icon top-right in zinc-500.
- **TOTAL MILES** — same shape; number "16,876"; sub-lines "Miles" and "0.68× around the world" (zinc-500); top-right globe icon.
- **TIME IN THE AIR** — same shape; "31h 51m"; sub-line "1.3 days"; top-right clock icon.

All three cards share the dark glass surface, faint white-5 border, and an *extremely* subtle top-edge highlight.

**Row 2 — two columns:**

- **World map card (left, `col-span-8`).** The hero element. A wide `rounded-2xl` card with a deep navy fill. Inside:
  - A **flat 2D world map** rendered from `public/countries.geojson` using an equirectangular projection. Continents are filled in a slightly lighter navy (`fill-slate-700/40`) with hairline `stroke-slate-500/30` outlines.
  - **Flight arcs** — every saved route is drawn as a glowing white quadratic Bézier curve (with a slight altitude bow), low-opacity outer halo (`stroke-white/40`) and a sharper white core line. Arc dashing optional; a slow ~6s "particle" tween moves a brighter highlight along the arc to suggest motion.
  - **Endpoints** — small filled white dots with a soft outer glow at every airport in the dataset.
  - **City labels** — city name (e.g. `Anchorage`, `Seattle`, `Los Angeles`, `New York`) in `text-xs text-zinc-300` placed adjacent to each dot.
  - **Hover tooltip** — when the cursor is over an arc, a `rounded-md bg-slate-900/90 border-white/10` chip appears showing `SEA-ANC: 1,448 mi` in white.

- **Right column (col-span-4, two stacked cards):**
  - **TOP AIRLINES card** — eyebrow, then a row per airline: airline name in white (`Alaska Airlines`) with `(8 flights, 100%)` in zinc-500 next to it, an animated sky-blue progress bar underneath (rounded, gradient `from-sky-500 to-blue-500`), and the airline's logo on the right.
  - **TOP AIRPORTS card** — eyebrow, then a **donut chart** taking up most of the card. Segments use a vivid multi-hue palette (sky, cyan, teal, emerald, violet) with a wide ring (~24px stroke) and a hollow dark center. A legend on the right lists each IATA with its count: `JFK (5)`, `LAX (4)`, `SEA (3)`, `ANC (2)`, `BRW (1)`, each preceded by a colored dot matching its slice.

**Row 3 — bottom row, two columns:**

- **LONGEST & SHORTEST card** (`col-span-4`) — eyebrow, then two simple text lines:
  - `Longest: JFK → LAX (2,469 mi)`
  - `Shortest: BRW → ANC (723 mi)`
  - Plain white text on the dark glass surface; arrow glyph in zinc-400.
- **FLIGHTS BY YEAR card** (`col-span-8`) — eyebrow, then a **horizontal** bar chart. Year labels on the left in zinc-400 (`2026 (8)` showing the count in parens), and a long rose-400 bar to the right per year. Bars are `rounded-md`, `h-6`, with a subtle gradient (`from-rose-400 to-rose-500`). Multiple years stack with `gap-3`.

### Bottom strip (web)

The web Statistics dashboard reserves a thin bottom strip (~48px) for utility:
- **Centered tabs** — `Flights | Statistics | More` rendered as plain text labels, with the active tab in white and inactive in zinc-500. No pill background — just text + a tiny underline on the active item.
- **Right-aligned `New` button** — a compact white-on-dark pill (`rounded-full bg-white/10 border border-white/10`) for quickly adding a flight from anywhere on the dashboard.

(On the Flights view this strip is not present — the sidebar is enough — but on the Statistics dashboard it complements the wider canvas.)

### Interaction notes (web)

- Buttons and inputs all share the **dark glass** recipe: `bg-white/5 border border-white/10 hover:bg-white/10`.
- Focus state: a 1px sky-400 ring (`focus:ring-1 focus:ring-sky-400/60`) instead of the app's solid border swap.
- Hover on flight rows: card border brightens, mini-map's arc gains a tiny extra glow, status pill stays static.
- Loading: skeleton blocks of `bg-white/5` with a slow shimmer rather than spinners.
- Charts (donut, bar, map arcs) animate in from zero on first paint with a 600–800ms ease-out.

---

## Part 4 — Overall feel

- **App** = a quiet black-and-white travel journal — calm surfaces, big legible IATA codes, a single emerald button to add a flight, and one sky-blue arc on a real photographic globe when you look one up.
- **Website** = a glowing operations console — same brand vocabulary, but turned up: a glassmorphic sidebar with a lit-up active tab, oversized data on first glance, and one big illuminated world map that shows everywhere you've been at a glance.
