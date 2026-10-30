# Treena — Landing Site Design Document

This document describes — in exhaustive detail — the current design of the Treena
marketing site as it exists in this repository. It is meant to be usable as:

1. A **reference** for anyone opening a PR against the site (so that new
   additions cohere with the existing design language).
2. An **audit trail** of every design decision that is encoded in the CSS, the
   component tree, and the copy.
3. A **spec** that could be handed to a designer or developer reproducing the
   site from scratch.

The site is a single-page marketing landing page for Treena, a native iOS/Android
app that brings a "real IDE" to mobile — file tree, editor, git, remote
terminal, and an AI agent that edits code. The site's job is to convince a
technical reader that Treena is *not a toy* in under thirty seconds of scrolling.

---

## 1. Product positioning and voice

The design is in service of three claims, in descending importance:

1. **"A real IDE in your pocket."** Not a chat wrapper. Not a gimmick.
   The page has to feel like something a working engineer would take seriously.
2. **"Every frontier model, one tap away."** Model-agnostic, BYO-key,
   no middleman.
3. **"Three taps from idea to push."** The loop — prompt, review, commit, push —
   works end-to-end on a phone, including against real git remotes.

The voice, expressed in copy across `Hero.tsx`, `Features.tsx`, `Flow.tsx`,
`Terminal.tsx`, `FAQ.tsx`, and `CTA.tsx`, is:

- **Terse.** Short sentences. "Your server, in your pocket." "Three taps from
  idea to push." No marketing filler.
- **Concrete, not abstract.** Every feature line names a real mechanism:
  *isomorphic-git*, *WebSockets*, *OpenRouter*, *M/U/A/D badges*, *keychain
  storage*. Specificity is load-bearing — it is how the page signals
  credibility.
- **Self-aware of mobile context.** "on the bus", "when your subway emerges",
  "five-inch canvas and a flaky train connection". The copy repeatedly reminds
  the reader *why* a mobile IDE matters, without arguing for it.
- **Dry.** There is exactly zero hype vocabulary. No "revolutionary",
  "game-changing", "10x". The emotional register is closer to a README than a
  product page.

The design must not contradict this voice. That is the single largest
constraint on future additions.

---

## 2. Visual system

### 2.1 Color tokens

All colors are declared as CSS custom properties in `app/globals.css` under a
Tailwind v4 `@theme` block, so they are available both as CSS variables
(`var(--color-accent)`) and as Tailwind classes (`text-[var(--color-accent)]`).
There is a single dark palette — there is no light mode, and there is no
design intent to add one.

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#0A0A0A` | Page background. Near-black but not pure black; pure black reads as OLED/flat and undermines depth. |
| `--color-surface` | `#1E1E1E` | Primary elevated surface (window chrome, editor body). Matches VS Code's default dark editor background exactly — this is intentional. |
| `--color-surface-2` | `#252526` | Slightly lighter surface, also from the VS Code palette. Reserved for sub-surfaces. |
| `--color-border` | `#3C3C3C` | Strong border. Currently unused in JSX but kept for future editor-adjacent UI. |
| `--color-border-light` | `#4D4D4D` | Softer border; same note. |
| `--color-text` | `#D4D4D4` | Body/foreground. VS Code default. Warm-gray, not pure white — pure white on `#0A0A0A` reads as harsh. |
| `--color-text-secondary` | `#858585` | Body copy, meta. Roughly WCAG AA against `#0A0A0A` at the body size we use (≥15px). |
| `--color-text-muted` | `#717171` | Lowest-emphasis text: captions, kbds, legal, footer copyright. |
| `--color-accent` | `#00FF88` | Brand green. Used for CTA backgrounds, "live" dots, section eyebrows, active terminal prompts. |
| `--color-accent-dim` | `#00CC6A` | Secondary accent for gradient stops and aura glows. |
| `--color-modified` | `#E2C08D` | Git-status "Modified" — matches VS Code's `gitDecoration.modifiedResourceForeground`. |
| `--color-untracked` | `#73C991` | Git-status "Untracked" — same source. |
| `--color-deleted` | `#F14C4C` | Git-status "Deleted" — same source. |
| `--color-folder` | `#DCAD73` | Folder color in the file explorer mockup — Monokai/VS Code-ish folder yellow. |

**Why these specifically.** Treena is an IDE. The page takes a strong position
that the editor mockup should be *indistinguishable from the real thing* to a
technical viewer's peripheral vision. So the editor colors (surface, text,
gutter muted, git-status channel) are borrowed from VS Code's dark+ theme
verbatim. The one color that is *not* borrowed is the accent — `#00FF88` is the
brand green, and it is the only thing on the page that reads as "ours".

**Token discipline.** Any new color used in more than one place should be added
to the `@theme` block. One-off hex values are acceptable only for
representation of external brands (provider dots in `ModelMarquee.tsx` /
`Models.tsx`) and the traffic-light window buttons (`#FF5F56`, `#FFBD2E`,
`#27C93F`).

### 2.2 Typography

Two fonts. Loaded once in `app/layout.tsx` via `next/font/google` with
`display: "swap"` and exposed as CSS variables:

- **Inter** (`--font-inter`) — all prose, headings, nav, CTAs.
- **JetBrains Mono** (`--font-jetbrains`) — eyebrows, kbd-like badges, code,
  terminal, file tree, meta captions, the "v1 · now on iOS & Android" chip.

**Mono is not just for code.** The page uses JetBrains Mono as a second voice
for any element that should read as *technical metadata*: version strings,
provider names, step numbers (`01`, `02`, `03`), breadcrumbs in window chrome,
copyright lines, "streaming" indicators. This is deliberate. It gives
non-code UI the same texture as the code mock-ups, so the two don't look like
they came from different design systems.

**Type scale (effective sizes).**

| Role | Component | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero H1 | `Hero.tsx:16` | `5xl` (48px) / `7xl` (72px) md+ | 600 | tight |
| Section H2 | `Features`, `Flow`, `Models`, `FAQ`, `Terminal` | `3xl` (30px) / `5xl` (48px) md+ | 600 | tight |
| CTA H2 | `CTA.tsx:19` | `4xl` (36px) / `6xl` (60px) md+ | 600 | tight |
| Card H3 | `Features`, `Flow`, `Models` | `lg` or `xl` | 600 | tight |
| Body lead | Hero subhead, section subheads | `17–20px` | 400 | normal |
| Body | Paragraphs, list items | `15px` | 400 | `leading-relaxed` |
| Eyebrow | Above every H2 | `11px`, `tracking-[0.22em]`, uppercase, mono, accent | 400 | very wide |
| Meta | Window chrome labels, footer copyright | `11–12px` mono | 400 | normal |

**Heading finish.** All display headings use `tracking-tight` and
`leading-[1.02]–[1.05]`. The hero and the CTA use the `.gradient-text` utility
(§ 2.4) so they read as *the anchors* of the page, visually distinct from the
mid-page H2s which are solid white. Deliberate: the gradient is a reward you
get at the top and the bottom, not noise in the middle.

### 2.3 Spacing, rhythm, and layout

- **Max width.** Every section centers on `max-w-6xl` (1152px) with `px-5`
  gutters, except the FAQ (`max-w-3xl`) and the CTA (`max-w-3xl`) which
  narrow for readability. The editor showcase lives inside the 6xl container
  but has its own internal 220px / 1fr grid.
- **Section vertical rhythm.** Every section uses the same cadence:
  `py-24 md:py-32`. The CTA is the one exception (`py-24 md:py-36`) because
  it wants to feel like the page's final breath.
- **Intra-section rhythm.** Section heading block → 3.5rem gap (`mt-14`) →
  content grid. This is consistent across `Features`, `Flow`, `Models`, and
  FAQ. Breaking this rhythm breaks the page.
- **Grid patterns.**
  - Three-up card grids: `grid gap-5 md:grid-cols-2 lg:grid-cols-3`
    (Features, Models). Gap of 20px chosen to keep cards discretely
    tile-like, not fused.
  - Three-step horizontal flow: `grid gap-6 md:grid-cols-3` (Flow).
  - Two-up marketing + mock: `grid gap-10 md:grid-cols-2 items-center`
    (Terminal).
- **Breakpoints.** Only one breakpoint is used seriously: `md` (768px).
  Below it, everything stacks; above it, the grids come to life. `lg` (1024px)
  is used exclusively to bump two-column card grids to three columns. There
  is no `sm` or `xl` work. Keeping to one breakpoint is a deliberate
  simplification — it's enough for a landing page and removes half the
  QA surface.

### 2.4 Effects vocabulary

Defined once in `globals.css` and reused everywhere. This is the closed set;
new effects should only be added to the stylesheet, never inlined.

- **`.hero-aura`** — three-stop radial gradient in green that sits under
  the hero. Layered on `pointer-events-none` so it never intercepts clicks.
- **`.grid-backdrop`** — 48px × 48px 1px grid with a radial mask so it fades
  out before reaching the section edges. Used *only* behind the hero, where
  it reinforces "editor/graph-paper" vibes without stealing focus.
- **`.glow-ring`** — a three-layer shadow (green inner ring + soft green
  bloom + deep black drop). Applied to every "window" on the page: the hero
  demo video, the editor mock, the terminal mock. It is the signature
  chrome of the site and should not be used on anything else.
- **`.gradient-text`** — white→mint→brand-green vertical gradient on
  text. Reserved for the hero H1 and CTA H2; nowhere else.
- **`.stripe-line`** — a 1px horizontal line with a green center fade.
  Used as the connecting line between the three `Flow` steps.
- **`.card`** — the base card style: dark vertical gradient background,
  hairline white border, lift on hover (`translateY(-3px)` and a green
  border tint). Used for every "tile" on the page (Features, Flow, Models).
- **`.dot` + `.live-dot`** — 8px circle + a pulsing box-shadow keyframe
  (`livePulse`) — used anywhere the page wants to say "this is live".
- **`.cursor`** — `steps(1)` 1s blink — used in terminal prompts and the
  "streaming" label on the editor agent bar.
- **`.marquee-track`** — 40-second linear `translateX(0 → -50%)` animation
  on the doubled model list in `ModelMarquee`.

The page's motion budget is deliberately tight: aura, marquee, cursor,
live-dot pulse, and reveal-on-scroll. That's it.

### 2.5 Motion

Two mechanisms for scroll reveal, both in `Reveal.tsx`:

1. **Preferred.** CSS scroll-driven animations (`animation-timeline: view()`)
   with `animation-range: entry 0% cover 35%`. Zero JS on supporting
   browsers.
2. **Fallback.** An `IntersectionObserver` with `threshold: 0.12` adds `.in`
   to `.reveal-js` elements, which then transition over 700ms on a custom
   `cubic-bezier(.2,.7,.2,1)` easing.

The `delay` prop on `Reveal` is used to stagger card grids at 40–60ms per
index. This is the only staggering convention on the page.

**Reduced motion.** `@media (prefers-reduced-motion: reduce)` zeroes out
all animation and transition durations (`globals.css:53`). Anything new
that introduces motion must either survive that override or opt out
of motion entirely when reduced motion is requested.

---

## 3. Page architecture

The home page is a single server component (`app/page.tsx`) that renders the
sections in order. The order is the information architecture and is
deliberate:

```
Nav           — orientation, one CTA
Hero          — claim, proof (demo video), one CTA
ModelMarquee  — credibility: "we support the models you already use"
Features      — the six things that make it a real IDE
EditorShowcase— the proof for "VS Code-grade editor"
Flow          — three-step mental model of the product loop
Terminal      — the proof for "real shell, not a toy"
Models        — the full provider matrix
FAQ           — objection handling
CTA           — the second ask, warmer than the first
Footer        — legal/nav
```

The read order follows a **claim → proof → claim → proof** rhythm. The hero
makes the top-level claim and immediately backs it with a video.
ModelMarquee/Models surround Features because the "plug in any model" claim
is a recurring chorus. EditorShowcase and Terminal are the two anchored
proofs that the claims are not marketing. FAQ absorbs objections
(web-wrapper? where does code live? do I need a key?) before the closing CTA.

### 3.1 Rendering model

- **Root layout (`app/layout.tsx`)** — server component. Loads Inter +
  JetBrains Mono via `next/font/google`, wires them as CSS variables,
  sets `suppressHydrationWarning` on `<body>` (safe here — no theme
  toggle, no client-only body children).
- **Page (`app/page.tsx`)** — server component. Pure composition.
- **Sections** — all server components *except* `Reveal.tsx`, which is
  `"use client"` only because it needs `useEffect` + `IntersectionObserver`
  for the scroll-driven-animation fallback. Every other animation is
  pure CSS and runs without shipping JS.

The site is intentionally almost-static: one client component, no
state, no fetches, no routes beyond `/`. This is a design decision, not
an accident — it keeps the LCP cheap and the maintenance surface
minimal.

### 3.2 Metadata and social

`app/layout.tsx` sets `metadataBase: "https://treena.app"` and populates
`title`, `description`, `openGraph`, and `twitter` (with `summary_large_image`).
The OG/Twitter image is `/icon.png`. The tagline is consistent across all
three: **"A real IDE in your pocket. Clone, edit, run, and ship with AI —
from your phone."**

If the tagline changes on the page, it must change here too.

---

## 4. Component specifications

Each component is described in terms of (a) what it communicates, (b) the
key visual affordances, and (c) the invariants that future changes must
preserve.

### 4.1 `Nav`

- **Sticky**, backdrop-blurred (`backdrop-blur-xl`), with a
  `rgba(10,10,10,0.55)` fill so headings behind it stay legible.
- Left: icon + wordmark, linked to `/`. The icon has a subtle white/10
  ring that brightens to brand-green on hover.
- Center (`md:` up): four anchor links — Features, Models, How it works,
  FAQ — in `--color-text-secondary`, white on hover.
- Right: pill CTA — brand-green background, black text, arrow suffix.
  Hover state goes to *white* (not a dimmer green). That is the page's
  standard CTA hover.
- **Invariant.** There is one primary CTA in the nav, never two.

### 4.2 `Hero`

- Two layered backdrops: `.hero-aura` + `.grid-backdrop`, both
  `pointer-events-none` and `aria-hidden`.
- **Status chip.** "v1 · now on iOS & Android" with a pulsing green dot.
  In mono. This chip is the signal that the app *already ships* — it is
  doing a lot of work in a small space.
- **H1** in `.gradient-text`, with a hard break between "Ship code" and
  "from your phone." on `md+`. On narrow screens it flows naturally.
- Subhead in `--color-text-secondary` at `17–20px`.
- **Primary CTA** ("Download Treena") + **secondary CTA** ("See how it
  works" → `#flow`). The primary is always the brand-green pill; the
  secondary is always a hairline-bordered pill.
- **Disclosure line** under the CTAs in mono muted: "Bring your own
  OpenRouter key · works with Claude, GPT, Gemini". This is the first
  concrete model name the visitor sees and is deliberate positioning.
- **Demo video frame.**
  - Green radial bloom behind it (`-inset-8 blur-2xl`).
  - Rounded `glow-ring` surface.
  - Window chrome: traffic lights + `treena · demo` breadcrumb + `live` dot.
  - `<video>` with `autoPlay muted loop playsInline preload="metadata"`
    and `poster="/icon.png"`. `muted` and `playsInline` are load-bearing
    for iOS autoplay.
  - Caption beneath in mono muted: "real device · real git · real shell".
    This is not decoration — it is the second concrete credibility line.

**Invariant.** Never let the hero grow a third CTA. Never replace the
video with a static image unless `prefers-reduced-motion` or a poster
fallback.

### 4.3 `ModelMarquee`

- Thin band between Hero and Features. `py-7`, `border-y white/5`,
  slightly lifted surface (`rgba(30,30,30,0.25)`).
- Eyebrow: "PLUG IN ANY MODEL" in mono muted.
- The track is the `models` array duplicated in place (`[...models,
  ...models]`) so the loop at `translateX(-50%)` is seamless.
- Each pill has a provider-colored dot + mono model name.
- Left/right 96px fade masks to black so models don't clip at the edges.

**Invariant.** This section is *a chorus*, not a section. It must stay
short (one row) and silent (no CTA, no heading).

### 4.4 `Features`

- Six cards. Each card = icon tile (green-tinted, monospace glyph) +
  title + body. The glyphs are deliberately text, not SVG
  (`✦`, `⎇`, `{ }`, `▤`, `>_`, `◎`) — so the card reads as a
  terminal/IDE artifact.
- Cards use the `.card` utility, hover lifts 3px, border tints
  brand-green.
- Copy is factual: each card names the *mechanism* behind the feature.
  Rewriting these into benefit-speak would break the voice.

### 4.5 `EditorShowcase`

This is the centerpiece proof. It is a full IDE mock rendered in HTML.

- **Window chrome.** Same traffic-lights + breadcrumb used across the
  page. Breadcrumb is `treena/app/index.tsx`.
- **Grid.** `grid-cols-1 md:grid-cols-[220px_1fr]`, fixed height
  `h-[480px]`. The 220px sidebar matches VS Code's default explorer width
  closely.
- **Explorer sidebar.** Collapsed on mobile (`hidden md:block`). Header:
  "EXPLORER · treena" in mono muted. Entries use triangle glyphs
  (▾/▸), color folders with `--color-folder`, and render a right-aligned
  M/U/A/D badge colored by the git-status token. One row has
  `active: true` and gets a `#2A2D2E` selection fill — that exact hex
  is VS Code's list item selection.
- **Code pane.** Renders from a hand-tokenized `codeLines` array. The
  `colorFor` mapping uses exact VS Code dark+ hexes:
  `#C586C0` (kw), `#CE9178` (str), `#DCDCAA` (fn), `#9CDCFE` (var),
  `#569CD6` (bool), `#4EC9B0` (tag). Line numbers are right-aligned in
  `--color-text-muted`. Leading/trailing whitespace is preserved with
  `whitespace-pre`.
- **Agent bar.** Footer strip: pulsing green dot + model name
  ("Claude Sonnet 4.6") + an in-flight prompt ("Fix the login bug and
  rerun the tests") + a `streaming▍` indicator hidden on `sm`.

**Invariant.** Any change to syntax colors, line numbers, or
selection fill must stay synchronized with VS Code dark+ — the
whole bit lands because the mock *is* the editor, not a reinterpretation.

### 4.6 `Flow`

- Three numbered step cards. Step numbers `01`, `02`, `03` in mono,
  framed in a 12×12 green-tinted square that reads as a keycap/kbd.
- A horizontal `.stripe-line` connects the three cards on `md+` at
  `top-[46px]` — roughly through the center of the step badges.
- Cards lift on hover like any other card.

**Invariant.** Three steps, never four. The "Three taps from idea to
push" claim is only true if there are three steps.

### 4.7 `Terminal`

- Two-column: left is copy + checklist, right is terminal mock.
- **Terminal mock.**
  - `rounded-2xl glow-ring bg-black/80`.
  - Same chrome as other windows, with an additional right-side status:
    pulsing green dot + `connected` in mono.
  - Prompt lines use the brand green (`--color-accent`), stdout lines
    use a muted `#858585`, successful exits use `#73C991` (matches the
    `untracked` token but used here as "ok green").
  - Final line is `$ ` with a blinking `▍` cursor.
- The left-column bulleted list uses `▸` (U+25B8) as the bullet, in
  brand green — matches the "command" energy of the terminal.

### 4.8 `Models`

- A six-card grid, one card per provider. Each card has a provider-
  colored dot, a mono uppercase provider name, and a list of supported
  models rendered in mono.
- Provider order is intentional: Anthropic, OpenAI, Google first
  (the three the visitor already cares about), then DeepSeek, Meta,
  Mistral.
- Intro copy explicitly mentions OpenRouter and 1M tokens. These
  numbers are meant to land.

### 4.9 `FAQ`

- Narrower column (`max-w-3xl`).
- Native `<details>`/`<summary>` with `list-none` and a custom `+` icon
  that rotates 45° on `open` via `group-open:rotate-45`. No JS.
- Row divider: `divide-y divide-white/5` inside a `rounded-2xl` shell
  with a hairline border. Open rows get a subtle `bg-white/[0.02]`.
- The questions are ordered by likely objection: wrapper? where does
  code live? do I need a key? what's the terminal? can the AI *really*
  edit? what languages? This ordering is deliberate and should be
  preserved when adding new questions.

### 4.10 `CTA`

- Centered. Single green radial bloom behind it — the only place on
  the page besides the hero where we spend the "big glow" effect.
- App icon, 80px, rounded 2xl, white/10 ring.
- H2 in `.gradient-text`, same as the hero.
- Primary CTA ("Join the beta") + secondary ("Tour the app" →
  `#features`).
- Footnote in mono muted: "iOS 16+ · Android 10+ · Free while in beta".
  This is the second concrete surface after the hero chip that anchors
  the app's real-world status.

### 4.11 `Footer`

- Three zones: brand, inline nav, copyright.
- Minimal intentionally — the CTA above it is the last "real" moment
  on the page.

---

## 5. Accessibility

The site makes a handful of deliberate a11y decisions that should be
preserved:

- **Reduced motion** is honored globally (`globals.css:53`). All
  animations and transitions collapse to 1ms.
- **Decorative backdrops** (`.hero-aura`, `.grid-backdrop`, CTA bloom)
  are all `aria-hidden` and `pointer-events-none`.
- **Landmark structure.** `<header>` (Nav), `<main>` (sections),
  `<footer>`. Each section has either an `id` (for in-page anchor
  targets) or an `aria-label` (e.g. the marquee: `aria-label="Supported
  models"`).
- **Focus contrast.** CTA hover goes from brand-green to *white*, not a
  dimmer green — this preserves high contrast under both hover and
  likely focus-visible states.
- **Color contrast.** Body copy is `#D4D4D4` on `#0A0A0A`, which
  exceeds WCAG AAA for normal text. Secondary copy at `#858585` clears
  AA at the sizes used (≥15px).
- **Native semantics for disclosure.** FAQ uses `<details>`/`<summary>`
  rather than a custom accordion — keyboard and screen-reader friendly
  out of the box.

Known gaps (acceptable for a marketing page, documented so future
additions don't assume they're fixed):

- The hero `<video>` has no captions or descriptive alternative text —
  the page would need a text summary for screen readers if the video
  carries unique information.
- Focus rings are not explicitly styled; the browser default is in
  effect.
- There is no skip-to-content link.

---

## 6. Performance

Design decisions that are load-bearing for performance:

- **Server components everywhere except `Reveal`.** The only JS on the
  page is one client component with a single `IntersectionObserver`.
- **Font loading via `next/font/google` with `display: "swap"`** means
  no render-blocking font fetches and no third-party font CDN.
- **`overflow-x: clip` on `<html>` and `<body>`** (`globals.css:32`) —
  the marquee, the hero aura, and the CTA bloom all extend past the
  viewport; `clip` avoids both horizontal scroll and the scroll-anchoring
  issues that `overflow-x: hidden` causes with sticky elements.
- **`preload="metadata"` on the hero video**, with `poster="/icon.png"`.
  The full 13MB `demo.mp4` only streams once playback is requested,
  and the poster is already cached by virtue of being the favicon/og
  image.
- **No images besides `/icon.png`**, which ships at a few KB. There is
  a `/logo-glow.png` in `public/` that is *not* currently referenced in
  the app — it is a staged asset; treat it as unused until wired up.
- **Single-file CSS**, Tailwind v4 + a handful of hand-written
  utilities. No component-level CSS, no CSS-in-JS.

Constraints for future work: anything that would add a second client
component, pull in an animation library, or register more than one
`IntersectionObserver` should be reviewed against the "almost-static"
principle before it lands.

---

## 7. Content inventory

A single source of truth for the concrete claims the site currently
makes. If any of these change in the product, they need to change on
the site too.

- **Platforms.** iOS 16+ and Android 10+, beta.
- **Auth model.** Bring your own OpenRouter key. Optional GitHub token
  for git. Optional remote server token for the terminal. All stored
  in the platform keychain.
- **Git.** Real git via isomorphic-git. Clone, commit, pull, push.
  Branch awareness. M/U/A/D badges in the file tree.
- **Editor.** JetBrains Mono, dark theme, 20+ languages (TypeScript,
  JavaScript, Python, Rust, Go, Swift, Kotlin, Java, C/C++/C#, Ruby,
  SQL, GraphQL, Dockerfile, YAML, JSON, Markdown, CSS, HTML).
- **Terminal.** WebSocket-backed remote shell. stdout/stderr/exit codes
  stream live. Auto-reconnect. One-tap kill.
- **Agent.** Reads and modifies files directly. Streams tokens.
- **Models advertised.**
  - Anthropic: Claude Sonnet 4.6, Claude Opus 4.6, Claude Sonnet 4.5.
  - OpenAI: GPT-5.4, GPT-4o.
  - Google: Gemini 3 Flash (1M), Gemini 2.5 Flash Lite (1M).
  - DeepSeek: DeepSeek R1.
  - Meta: Llama 3.3 70B.
  - Mistral: Mistral Large.
- **Context.** Up to 1M tokens.
- **Runtime.** Native app built on Expo + React Native.

---

## 8. Tech stack

For completeness, the stack the design is expressed in:

- **Next.js 15** App Router, React 19. (`app/` directory, no `pages/`.)
- **Tailwind CSS v4** via `@tailwindcss/postcss`. All theme tokens live
  in the `@theme` block in `globals.css` — there is no `tailwind.config.*`.
- **TypeScript 5.7**, strict by default.
- **`next/font/google`** for Inter and JetBrains Mono.
- **`next/image`** for the three raster assets referenced (`/icon.png`
  in Nav, Hero caption, CTA, Footer).
- **Deployment.** Vercel (`vercel.json` present, `.vercel/` linked).
- **No runtime dependencies** beyond React/Next — no animation library,
  no icon library, no component kit.

---

## 9. Extension guidelines

If you are adding a section, a card, a CTA, or a new visual, run through
the checklist below before you open a PR.

**Voice.**
- Does the copy name a concrete mechanism? (Good: "WebSocket-backed
  shell". Bad: "blazing fast terminal".)
- Is it under ~30 words for a card body, ~60 for a section lead?
- Does it avoid hype vocabulary?

**Color.**
- Is every color either a CSS token from § 2.1 or a justified external
  brand hex?
- Is the accent reserved for live/active/CTA semantics, not
  decoration?

**Type.**
- Are technical/meta elements set in JetBrains Mono?
- Is the heading in Inter at `tracking-tight`?
- If it's a display heading (hero or CTA), is `.gradient-text`
  applied?

**Layout.**
- Is the container `max-w-6xl px-5` (or `max-w-3xl` for narrow
  long-form)?
- Is vertical padding `py-24 md:py-32`?
- Is there exactly one `md:` breakpoint in play, not a ladder of
  breakpoints?

**Effects.**
- Are all effects drawn from § 2.4? New effects belong in
  `globals.css`, never inline.
- Is motion honored under `prefers-reduced-motion`?

**Structure.**
- Is the new section a server component? If it needs state, have you
  tried a pure-CSS solution first (see FAQ `<details>`, marquee
  animation, scroll-driven reveal)?
- If you must go client, does it fail gracefully without JS?

**Accessibility.**
- Are decorative elements `aria-hidden` and `pointer-events-none`?
- Does the section have a landmark or `aria-label`?
- Does it clear WCAG AA for body text?

**Content.**
- If the section names a product capability, is it listed in § 7?
- If it names a model or platform, does it match the copy in the
  FAQ and CTA?

---

## 10. Non-goals

Things the site is deliberately *not* doing, so that they stay off
future PRs unless explicitly reopened:

- **No light mode.** The product is dark; the marketing matches.
- **No localization.** Copy is English-only; `html lang="en"` is hardcoded.
- **No blog, no docs, no pricing page.** The site is a single page.
- **No analytics visible in source.** (Vercel's built-in analytics are
  separate.)
- **No third-party widgets.** No Intercom, no live chat, no embeds.
- **No icon library.** The icon slots in Features use monospace glyphs
  precisely to avoid pulling in Lucide/Phosphor/etc.
- **No animation library.** Framer Motion is not needed and would
  violate § 6.

If you find yourself wanting one of these, that is a product
conversation first, not a PR.
