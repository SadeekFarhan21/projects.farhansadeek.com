'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Slide data                                                         */
/* ------------------------------------------------------------------ */

const slides: SlideProps[] = [
  // 1 — Title
  {
    type: 'title',
    badge: 'Hack Dartmouth X',
    heading: 'Libera',
    subtitle: 'Find the freedom to shape your life.',
    tags: [
      { label: 'Breathwork', color: 'purple' },
      { label: 'EFT', color: 'pink' },
      { label: 'Meditation', color: 'amber' },
      { label: 'Journaling', color: 'purple' },
    ],
  },
  // 2 — Problem
  {
    type: 'cards',
    heading: ['The ', { text: 'Problem', accent: 'pink' }],
    cards: [
      { icon: 'extension', title: 'Fragmented Wellness', body: 'Meditation, breathwork, therapy techniques, and journaling exist in separate silos with no unified practice.' },
      { icon: 'psychology_alt', title: 'Reactive Living', body: 'Without tools to pause, people react impulsively to stress instead of responding with intention and clarity.' },
      { icon: 'smartphone', title: 'Dopamine Hijacking', body: 'Apps are designed to capture attention, not cultivate wellbeing. The average person checks their phone 96 times per day.' },
    ],
  },
  // 3 — Solution
  {
    type: 'cards',
    heading: ['Our ', { text: 'Solution', accent: 'purple' }],
    subtitle: 'A guided intervention platform that combines four evidence-based modalities into micro-sessions that fit between moments of your day.',
    cards: [
      { icon: 'air', title: 'Breathwork', body: 'Cyclic sighing, box breathing, and diaphragmatic techniques for nervous system regulation.' },
      { icon: 'visibility', title: 'Breath Watching', body: 'Mindfulness observation practice that builds present-moment awareness.' },
      { icon: 'self_improvement', title: 'EFT Visualization', body: 'Emotional Freedom Technique with guided imagery and sensory grounding.' },
      { icon: 'edit_note', title: 'Micro-Journal', body: 'Three reflective questions to process emotions and capture insights.' },
    ],
  },
  // 4 — Session Flow
  {
    type: 'flow',
    heading: ['The ', { text: '5-Minute Session', accent: 'gradient' }],
    subtitle: 'Each session guides you through five science-backed steps in just five minutes.',
    steps: [
      { num: 'Step 1', label: 'Mood Check-in', time: '10 sec' },
      { num: 'Step 2', label: 'Breathwork', time: '80 sec' },
      { num: 'Step 3', label: 'Breath Watching', time: '80 sec' },
      { num: 'Step 4', label: 'EFT Visualization', time: '90 sec' },
      { num: 'Step 5', label: 'Micro-Journal', time: '60 sec' },
    ],
    footer: 'Total: ~5 minutes \u2014 short enough to fit between any stimulus and response',
  },
  // 5 — Session Packages
  {
    type: 'packages',
    heading: ['Session ', { text: 'Packages', accent: 'purple' }],
    subtitle: 'Three curated programs cycling through 30 levels across 10 weeks.',
    packages: [
      {
        icon: 'anchor',
        title: 'The Morning You Love',
        accent: 'purple',
        body: 'Anchor your day. Build a consistent morning practice that sets the tone for intentional living.',
        tags: ['Anchor', 'Foundation'],
      },
      {
        icon: 'emoji_events',
        title: 'The Earned Moment',
        accent: 'amber',
        body: 'Reward your effort. Practice after accomplishments to build a healthy relationship with achievement.',
        tags: ['Achievement', 'Reward'],
      },
      {
        icon: 'wb_sunny',
        title: 'The Lighter You',
        accent: 'pink',
        body: 'Release what weighs you down. Evening sessions focused on letting go of the day\'s accumulated tension.',
        tags: ['Release', 'Evening'],
      },
    ],
  },
  // 6 — Dual Modes
  {
    type: 'two-col',
    heading: ['Two Ways to ', { text: 'Practice', accent: 'purple' }],
    left: {
      accent: 'purple',
      title: 'Path Mode',
      body: 'A structured 30-level progression across 10 weeks. Visual tree navigation guides you through increasingly deeper sessions.',
      bullets: ['30 levels cycling through 3 packages', 'Sequential unlocking', 'Visual tree navigation', 'Week-by-week progression'],
    },
    right: {
      accent: 'pink',
      title: 'Open Mode',
      body: 'Free-access exercise library. Pick any modality and dive straight in. No gates, no progression — just practice.',
      bullets: ['5 breathwork patterns', '4 guided meditations', '4 EFT scenarios', 'Habit Breaker widget'],
    },
  },
  // 8 — Insights
  {
    type: 'stats',
    heading: [{ text: 'Insights Dashboard', accent: 'gradient' }],
    subtitle: 'Track your growth with mood analytics, vividness scoring, and session history.',
    stats: [
      { value: '8', label: 'Sessions', accent: 'purple' },
      { value: '14', label: 'Day Streak', accent: 'pink' },
      { value: '87%', label: 'Vividness', accent: 'amber' },
      { value: '5', label: 'Mood Trend', accent: 'purple' },
    ],
    tags: [
      { label: 'Emoji Check-ins', color: 'purple' },
      { label: 'Session Timeline', color: 'pink' },
      { label: 'Package Filters', color: 'amber' },
    ],
  },
  // 9 — Tech Stack
  {
    type: 'tech',
    heading: ['Tech ', { text: 'Stack', accent: 'purple' }],
    layers: [
      { label: 'Next.js 16  •  React 19  •  TypeScript  •  Tailwind CSS 4', level: 1 },
      { label: 'Framer Motion  •  Glassmorphism UI  •  Material Icons', level: 2 },
      { label: 'Supabase (PostgreSQL + Auth + RLS)  •  Server Actions', level: 3 },
      { label: 'Web Audio API (synthesized ambient audio)  •  Vercel Deployment', level: 4 },
    ],
    cards: [
      { title: 'Web', body: 'Server Components by default, client interactivity where needed. App Router with streaming and Suspense boundaries.' },
      { title: 'Audio', body: 'Procedurally generated ambient audio — rain, white noise, cello drone, singing bowl — all synthesized in-browser with the Web Audio API.' },
    ],
  },
  // 10 — Architecture
  {
    type: 'arch',
    heading: ['System ', { text: 'Architecture', accent: 'pink' }],
    quadrants: [
      { icon: 'devices', title: 'Frontend Layer', accent: 'purple', bullets: ['App Router · Server & Client Components', 'Sanctuary / Library mode toggle', 'Responsive: sidebar ↔ bottom nav', 'Framer Motion transitions'] },
      { icon: 'play_circle', title: 'Session Engine', accent: 'gradient', bullets: ['30 levels × 3 packages = 90 sessions', '5 timed steps per session', 'Emoji mood tracking (0–100)', 'Dynamic content per package'] },
      { icon: 'auto_awesome', title: 'Smart Features', accent: 'pink', bullets: ['Negativity screening on EFT inputs', 'Synthesized ambient audio (Web Audio)', 'TTS narration for guided sessions', 'Habit Breaker craving-interrupt'] },
      { icon: 'database', title: 'Data Layer', accent: 'amber', bullets: ['Supabase PostgreSQL + RLS', 'Session store via React Context', 'Server Actions for mutations', 'Vividness scoring per package'] },
    ],
  },
  // 11 — Quote
  {
    type: 'quote',
    quote: '"Between stimulus and response there is a space. In that space is our power to choose our response. In our response lies our growth and our freedom."',
    author: 'Viktor Frankl',
    footer: 'Libera exists in that space.',
  },
  // 12 — Thank You
  {
    type: 'title',
    badge: 'Hack Dartmouth X',
    heading: 'Thank You',
    subtitle: 'Libera — Find the freedom to shape your life.',
    tags: [
      { label: 'Responsive Web', color: 'purple' },
      { label: 'Evidence-Based', color: 'pink' },
      { label: '5-Minute Sessions', color: 'amber' },
    ],
    footer: 'github.com/SadeekFarhan21/agencyhealth',
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Accent = 'purple' | 'pink' | 'amber' | 'gradient';
type HeadingPart = string | { text: string; accent: Accent };

interface TagDef { label: string; color: 'purple' | 'pink' | 'amber' }
interface CardDef { icon: string; title: string; body: string }
interface FlowStep { num: string; label: string; time: string }
interface PackageDef { icon: string; title: string; accent: Accent; body: string; tags: string[] }
interface StatDef { value: string; label: string; accent: Accent }
interface LayerDef { label: string; level: number }
interface ColDef { accent: Accent; title: string; body: string; bullets: string[] }
interface QuadDef { icon: string; title: string; accent: Accent; bullets: string[] }

type SlideProps =
  | { type: 'title'; badge?: string; heading: string; subtitle: string; tags?: TagDef[]; footer?: string }
  | { type: 'cards'; heading: HeadingPart[]; subtitle?: string; cards: CardDef[] }
  | { type: 'flow'; heading: HeadingPart[]; subtitle: string; steps: FlowStep[]; footer: string }
  | { type: 'packages'; heading: HeadingPart[]; subtitle: string; packages: PackageDef[] }
  | { type: 'two-col'; heading: HeadingPart[]; left: ColDef; right: ColDef }
  | { type: 'stats'; heading: HeadingPart[]; subtitle: string; stats: StatDef[]; tags: TagDef[] }
  | { type: 'tech'; heading: HeadingPart[]; layers: LayerDef[]; cards: { title: string; body: string }[] }
  | { type: 'arch'; heading: HeadingPart[]; quadrants: QuadDef[] }
  | { type: 'quote'; quote: string; author: string; footer: string };

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */

const accentClass: Record<Accent, string> = {
  purple: 'text-violet-400',
  pink: 'text-pink-400',
  amber: 'text-amber-400',
  gradient: 'bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent',
};

const tagBorder: Record<string, string> = {
  purple: 'border-violet-400/40 text-violet-400',
  pink: 'border-pink-400/40 text-pink-400',
  amber: 'border-amber-400/40 text-amber-400',
};

const layerStyle: Record<number, string> = {
  1: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
  2: 'bg-pink-500/10 border-pink-400/25 text-pink-400',
  3: 'bg-amber-500/10 border-amber-400/25 text-amber-400',
  4: 'bg-white/[0.03] border-white/[0.08] text-zinc-400',
};

function Heading({ parts }: { parts: HeadingPart[] }) {
  return (
    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center">
      {parts.map((p, i) =>
        typeof p === 'string' ? <span key={i}>{p}</span> : <span key={i} className={accentClass[p.accent]}>{p.text}</span>
      )}
    </h2>
  );
}

function Divider() {
  return <div className="w-16 h-[3px] rounded-full bg-gradient-to-r from-violet-400 to-pink-400 mx-auto mt-4 mb-2" />;
}

function Tag({ label, color }: TagDef) {
  return <span className={`inline-block px-3.5 py-1 rounded-full text-sm font-medium border ${tagBorder[color]} bg-white/[0.03]`}>{label}</span>;
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
      {name}
    </span>
  );
}

function Card({ icon, title, body }: CardDef) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm hover:border-violet-400/30 transition-all hover:-translate-y-0.5 text-center">
      <Icon name={icon} className="text-3xl text-violet-400 block mb-3" />
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-[0.95rem] text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide renderers                                                    */
/* ------------------------------------------------------------------ */

function SlideContent({ data }: { data: SlideProps }) {
  switch (data.type) {
    case 'title':
      return (
        <div className="flex flex-col items-center gap-5">
          {data.badge && <span className="text-sm font-semibold tracking-[0.15em] uppercase text-zinc-500">{data.badge}</span>}
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">{data.heading}</h1>
          <Divider />
          <p className="text-xl text-zinc-400 font-light max-w-[700px] text-center">{data.subtitle}</p>
          {data.tags && <div className="flex flex-wrap gap-2.5 justify-center mt-2">{data.tags.map((t) => <Tag key={t.label} {...t} />)}</div>}
          {data.footer && <p className="text-sm text-zinc-500 mt-4">{data.footer}</p>}
        </div>
      );

    case 'cards':
      return (
        <div className="flex flex-col items-center w-full max-w-[1100px]">
          <Heading parts={data.heading} />
          <Divider />
          {data.subtitle && <p className="text-lg text-zinc-400 font-light max-w-[700px] text-center mt-2 mb-4">{data.subtitle}</p>}
          <div className={`grid gap-5 mt-6 w-full ${data.cards.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
            {data.cards.map((c) => <Card key={c.title} {...c} />)}
          </div>
        </div>
      );

    case 'flow':
      return (
        <div className="flex flex-col items-center w-full">
          <Heading parts={data.heading} />
          <Divider />
          <p className="text-lg text-zinc-400 font-light max-w-[700px] text-center mt-2">{data.subtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {data.steps.map((s, i) => (
              <div key={s.num} className="contents">
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 py-4 text-center min-w-[140px]">
                  <div className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1">{s.num}</div>
                  <div className="text-base font-medium text-zinc-100">{s.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.time}</div>
                </div>
                {i < data.steps.length - 1 && <span className="text-zinc-600 text-lg hidden md:block">&rarr;</span>}
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-500 mt-6">{data.footer}</p>
        </div>
      );

    case 'packages':
      return (
        <div className="flex flex-col items-center w-full max-w-[1100px]">
          <Heading parts={data.heading} />
          <Divider />
          <p className="text-lg text-zinc-400 font-light max-w-[700px] text-center mt-2">{data.subtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 w-full">
            {data.packages.map((pkg) => {
              const borderColor = pkg.accent === 'purple' ? 'border-violet-400/30' : pkg.accent === 'amber' ? 'border-amber-400/30' : 'border-pink-400/30';
              return (
                <div key={pkg.title} className={`bg-white/[0.03] border ${borderColor} rounded-2xl p-6 backdrop-blur-sm`}>
                  <Icon name={pkg.icon} className={`text-3xl block mb-3 ${accentClass[pkg.accent]}`} />
                  <h3 className={`text-lg font-semibold mb-2 ${accentClass[pkg.accent]}`}>{pkg.title}</h3>
                  <p className="text-[0.95rem] text-zinc-400 leading-relaxed">{pkg.body}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {pkg.tags.map((t) => <Tag key={t} label={t} color={pkg.accent === 'gradient' ? 'purple' : pkg.accent} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'two-col':
      return (
        <div className="flex flex-col items-center w-full max-w-[1100px]">
          <Heading parts={data.heading} />
          <Divider />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 w-full">
            {[data.left, data.right].map((col) => {
              const borderColor = col.accent === 'purple' ? 'border-violet-400/30' : 'border-pink-400/30';
              return (
                <div key={col.title} className={`bg-white/[0.03] border ${borderColor} rounded-2xl p-7 backdrop-blur-sm`}>
                  <h3 className={`text-xl font-semibold mb-2 ${accentClass[col.accent]}`}>{col.title}</h3>
                  <p className="text-[0.95rem] text-zinc-400 leading-relaxed">{col.body}</p>
                  <ul className="mt-4 space-y-2.5">
                    {col.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[0.95rem] text-zinc-400">
                        <span className="mt-2 w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'stats':
      return (
        <div className="flex flex-col items-center w-full max-w-[1100px]">
          <Heading parts={data.heading} />
          <Divider />
          <p className="text-lg text-zinc-400 font-light max-w-[700px] text-center mt-2">{data.subtitle}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8 w-full">
            {data.stats.map((s) => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center">
                <div className={`text-4xl font-extrabold leading-none ${accentClass[s.accent]}`}>{s.value}</div>
                <div className="text-sm text-zinc-500 mt-2">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center mt-6">
            {data.tags.map((t) => <Tag key={t.label} {...t} />)}
          </div>
        </div>
      );

    case 'tech':
      return (
        <div className="flex flex-col items-center w-full max-w-[900px]">
          <Heading parts={data.heading} />
          <Divider />
          <div className="w-full mt-6 space-y-2">
            {data.layers.map((l) => (
              <div key={l.level} className={`w-full py-4 px-6 rounded-xl text-center font-medium text-base border ${layerStyle[l.level]}`}>{l.label}</div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 w-full">
            {data.cards.map((c) => (
              <div key={c.title} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{c.title}</h3>
                <p className="text-[0.95rem] text-zinc-400 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'arch': {
      const borderAccent: Record<Accent, string> = {
        purple: 'border-l-violet-400',
        pink: 'border-l-pink-400',
        amber: 'border-l-amber-400',
        gradient: 'border-l-violet-400',
      };
      const dotAccent: Record<Accent, string> = {
        purple: 'bg-violet-400',
        pink: 'bg-pink-400',
        amber: 'bg-amber-400',
        gradient: 'bg-gradient-to-r from-violet-400 to-pink-400',
      };
      return (
        <div className="flex flex-col items-center w-full max-w-[900px]">
          <Heading parts={data.heading} />
          <Divider />
          <div className="flex flex-col gap-0 mt-8 w-full relative">
            {/* Vertical connector line */}
            <div className="absolute left-7 top-6 bottom-6 w-px bg-gradient-to-b from-violet-400/40 via-pink-400/40 to-amber-400/40 hidden md:block" />
            {data.quadrants.map((q, i) => (
              <div key={q.title} className="relative flex items-stretch gap-0">
                {/* Connector node */}
                <div className="hidden md:flex flex-col items-center w-14 shrink-0 relative z-10">
                  <div className={`w-3.5 h-3.5 rounded-full ${dotAccent[q.accent]} mt-6 ring-4 ring-[#0a0a0f]`} />
                </div>
                {/* Layer card */}
                <div className={`flex-1 bg-white/[0.03] border border-white/[0.08] ${borderAccent[q.accent]} border-l-[3px] rounded-xl p-5 ${i < data.quadrants.length - 1 ? 'mb-3' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon name={q.icon} className={`text-2xl ${accentClass[q.accent]}`} />
                    <h3 className={`text-lg font-semibold ${accentClass[q.accent]}`}>{q.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {q.bullets.map((b) => (
                      <span key={b} className="text-[0.9rem] text-zinc-400 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotAccent[q.accent]} shrink-0`} />
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quote':
      return (
        <div className="flex flex-col items-center gap-6 max-w-[800px]">
          <blockquote className="text-2xl md:text-3xl font-light italic text-zinc-200 text-center leading-relaxed border-l-[3px] border-violet-400 pl-7">
            {data.quote}
            <footer className="text-base not-italic text-zinc-500 mt-4">— {data.author}</footer>
          </blockquote>
          <p className="text-lg text-zinc-400 font-light">{data.footer}</p>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Main presentation component                                        */
/* ------------------------------------------------------------------ */

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  const go = useCallback(
    (n: number) => { if (n >= 0 && n < total) setCurrent(n); },
    [total],
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(current + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); go(current - 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(total - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go, total]);

  // Touch swipe
  useEffect(() => {
    let startX = 0;
    function onStart(e: TouchEvent) { startX = e.touches[0].clientX; }
    function onEnd(e: TouchEvent) {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) diff > 0 ? go(current + 1) : go(current - 1);
    }
    window.addEventListener('touchstart', onStart);
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, [current, go]);

  return (
    <div
      className="fixed inset-0 bg-[#0a0a0f] text-zinc-200 overflow-hidden select-none"
      onClick={(e) => {
        const rect = (e.target as HTMLElement).closest('a, button');
        if (rect) return;
        e.clientX < window.innerWidth / 3 ? go(current - 1) : go(current + 1);
      }}
    >
      {/* Background glows */}
      <div className="fixed -top-52 -left-24 w-[600px] h-[600px] rounded-full bg-violet-500 blur-[180px] opacity-15 pointer-events-none" />
      <div className="fixed -bottom-52 -right-24 w-[600px] h-[600px] rounded-full bg-pink-500 blur-[180px] opacity-15 pointer-events-none" />

      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex flex-col items-center justify-center px-8 md:px-16 py-12"
        >
          <SlideContent data={slides[current]} />
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <motion.div
        className="fixed bottom-0 left-0 h-[3px] bg-gradient-to-r from-violet-400 to-pink-400"
        animate={{ width: `${((current + 1) / total) * 100}%` }}
        transition={{ duration: 0.4 }}
      />

      {/* Slide counter */}
      <div className="fixed bottom-5 right-8 text-sm text-zinc-500 tabular-nums">
        {current + 1} / {total}
      </div>

      {/* Nav hint */}
      <div className="fixed bottom-5 left-8 text-xs text-zinc-700">
        &larr; &rarr; or click to navigate
      </div>
    </div>
  );
}
