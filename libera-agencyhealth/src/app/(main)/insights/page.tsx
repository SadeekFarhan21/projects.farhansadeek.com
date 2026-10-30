'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore, SessionRecord } from '@/lib/session-store';
import { EFT_CONFIGS } from '@/lib/eft-config';
import { PACKAGES, PackageId } from '@/lib/session-data';

type Filter = 'all' | PackageId;

// Reuse mood label from break-modal logic
function getMoodLabel(v: number) {
  if (v < 15) return 'Very Low';
  if (v < 35) return 'Low';
  if (v < 55) return 'Neutral';
  if (v < 75) return 'Good';
  return 'Great';
}

function getMoodEmoji(v: number) {
  if (v < 15) return '😢';
  if (v < 35) return '😟';
  if (v < 55) return '😐';
  if (v < 75) return '🙂';
  return '😄';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Vividness label ──
function vividLabel(v: number) {
  if (v >= 0.9) return 'Crystal Clear';
  if (v >= 0.65) return 'Getting Vivid';
  if (v >= 0.35) return 'Coming Into Focus';
  return 'First Glimpse';
}

// ── Per-package colour classes (static so Tailwind keeps them) ──
const PKG_TEXT: Record<PackageId, string> = {
  anchor: 'text-primary',
  'earned-moment': 'text-tertiary',
  'lighter-you': 'text-secondary',
};
const PKG_BORDER: Record<PackageId, string> = {
  anchor: 'border-primary/30',
  'earned-moment': 'border-tertiary/30',
  'lighter-you': 'border-secondary/30',
};

// ── Session card ──
function SessionCard({
  session,
  vividness,
  expanded,
  onToggle,
}: {
  session: SessionRecord;
  vividness: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = EFT_CONFIGS[session.packageId];
  const pkg = PACKAGES[session.packageId];
  const narrative = config.buildNarrative(session.eftAnswers);
  const [firstParagraph] = narrative.split('\n\n');

  const opacity = 0.18 + vividness * 0.82;
  const blur = (1 - vividness) * 1.8;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="relative"
    >
      {/* Timeline dot */}
      <div
        className={`absolute -left-[2.15rem] top-4 w-3 h-3 rounded-full border-2 bg-surface transition-all duration-500 ${PKG_BORDER[session.packageId]}`}
        style={{
          opacity,
          boxShadow: vividness > 0.65 ? `0 0 8px rgba(205,197,240,0.35)` : 'none',
        }}
      />

      <button onClick={onToggle} className="w-full text-left group">
        <div
          className={`glass-panel rounded-xl p-5 border transition-all duration-500 ${
            expanded ? PKG_BORDER[session.packageId] : 'border-outline-variant/10 hover:border-outline-variant/25'
          }`}
          style={{ opacity }}
        >
          {/* Card header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`material-symbols-outlined text-base ${PKG_TEXT[session.packageId]}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {pkg.icon}
              </span>
              <span className={`text-xs font-label uppercase tracking-wider ${PKG_TEXT[session.packageId]}`}>
                {pkg.label}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider">
                {vividLabel(vividness)}
              </span>
              <span className="text-xs text-on-surface-variant/40">{formatDate(session.date)}</span>
            </div>
          </div>

          {/* First paragraph of narrative with vivid blur effect */}
          <p
            className="text-sm leading-relaxed text-on-surface-variant/80 font-light italic"
            style={{ filter: `blur(${blur}px)`, transition: 'filter 0.6s ease' }}
          >
            {firstParagraph}
          </p>

          {/* Expand toggle */}
          <div className="flex items-center gap-1 mt-3 text-on-surface-variant/30 group-hover:text-on-surface-variant/50 transition-colors">
            <span className="material-symbols-outlined text-xs">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
            <span className="text-[10px] uppercase tracking-wider">{expanded ? 'Less' : 'Full entry'}</span>
          </div>
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32 }}
            className="overflow-hidden"
          >
            <div
              className={`glass-panel rounded-xl p-5 mt-2 border flex flex-col gap-4 ${PKG_BORDER[session.packageId]}`}
              style={{ opacity }}
            >
              {/* Full narrative */}
              <div>
                <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant/40 mb-2">
                  Full Narrative
                </p>
                <p
                  className="text-sm leading-relaxed text-on-surface-variant/80 italic whitespace-pre-line"
                  style={{ filter: `blur(${blur}px)`, transition: 'filter 0.6s ease' }}
                >
                  {narrative}
                </p>
              </div>

              {/* Answers */}
              {session.eftAnswers.some((a) => a?.trim()) && (
                <div className="border-t border-outline-variant/10 pt-3">
                  <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant/40 mb-2">
                    Your Answers
                  </p>
                  <div className="flex flex-col gap-1">
                    {[config.labelA, config.labelB].map((label, li) => {
                      const answers =
                        li === 0
                          ? [session.eftAnswers[0]]
                          : config.inputType === 'two-singles'
                          ? [session.eftAnswers[1]]
                          : [session.eftAnswers[1], session.eftAnswers[2], session.eftAnswers[3]].filter(Boolean);
                      return (
                        <p key={label} className="text-xs text-on-surface-variant/70">
                          <span className="text-on-surface-variant/40">{label}: </span>
                          {answers.filter(Boolean).join(', ') || '—'}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Journal */}
              <div className="border-t border-outline-variant/10 pt-3">
                <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant/40 mb-2">
                  Journal
                </p>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-on-surface-variant/70">
                    <span className="text-on-surface-variant/40">Feeling: </span>
                    {session.journal.q1 || '—'}
                  </p>
                  <p className="text-xs text-on-surface-variant/70">
                    <span className="text-on-surface-variant/40">Good thing: </span>
                    {session.journal.q2 || '—'}
                  </p>
                  <p className="text-xs text-on-surface-variant/70">
                    <span className="text-on-surface-variant/40">Note: </span>
                    {session.journal.q3 || '—'}
                  </p>
                </div>
              </div>

              {/* Mood bar */}
              <div className="border-t border-outline-variant/10 pt-3">
                <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant/40 mb-2">
                  Mood on entry
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-secondary-dim via-primary-dim to-primary"
                      style={{ width: `${session.mood}%` }}
                    />
                  </div>
                  <span className="text-xs text-on-surface-variant/60 shrink-0">
                    {getMoodLabel(session.mood)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ──
export default function InsightsPage() {
  const { sessions } = useSessionStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute vividness: position within each package's chronological sessions
  const vividnessMap = useMemo(() => {
    const byPkg = new Map<PackageId, SessionRecord[]>();
    for (const s of sessions) {
      byPkg.set(s.packageId, [...(byPkg.get(s.packageId) ?? []), s]);
    }
    const map = new Map<string, number>();
    byPkg.forEach((pkgSessions) => {
      const sorted = [...pkgSessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      sorted.forEach((s, i) => map.set(s.id, (i + 1) / sorted.length));
    });
    return map;
  }, [sessions]);

  // Filtered + sorted (newest first)
  const visible = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return filter === 'all' ? sorted : sorted.filter((s) => s.packageId === filter);
  }, [sessions, filter]);

  // Stats
  const totalSessions = sessions.length;
  const uniqueDays = new Set(sessions.map((s) => s.date.slice(0, 10))).size;
  const streak = useMemo(() => {
    const dates = [...new Set(sessions.map((s) => s.date.slice(0, 10)))]
      .sort()
      .reverse();
    let count = 0;
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(new Date(todayIso).getTime() - i * 86_400_000)
        .toISOString()
        .slice(0, 10);
      if (dates[i] === expected) count++;
      else break;
    }
    return count;
  }, [sessions, todayIso]);

  // Overall average vividness (for the header glow)
  const avgVividness =
    sessions.length === 0
      ? 0
      : [...vividnessMap.values()].reduce((a, v) => a + v, 0) / vividnessMap.size;

  const emojiBuckets = useMemo(
    () => [
      { emoji: '😢', label: 'Very Low', count: sessions.filter((s) => s.mood < 15).length },
      { emoji: '😟', label: 'Low', count: sessions.filter((s) => s.mood >= 15 && s.mood < 35).length },
      { emoji: '😐', label: 'Neutral', count: sessions.filter((s) => s.mood >= 35 && s.mood < 55).length },
      { emoji: '🙂', label: 'Good', count: sessions.filter((s) => s.mood >= 55 && s.mood < 75).length },
      { emoji: '😄', label: 'Great', count: sessions.filter((s) => s.mood >= 75).length },
    ],
    [sessions],
  );

  const recentEmojiCheckins = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [sessions],
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-10">
        <span className="text-tertiary font-label text-xs tracking-[0.2em] uppercase mb-3 block">
          Insights
        </span>
        <h1 className="font-headline font-bold text-4xl text-on-surface mb-2">
          The Vivid Storyline
        </h1>
        <p className="text-on-surface-variant/75 text-base leading-relaxed max-w-md">
          Each practice sharpens the image. The more you return to a vision, the more
          real it becomes.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: 'Trainings', value: totalSessions, icon: 'fitness_center' },
          { label: 'Day Streak', value: streak, icon: 'local_fire_department' },
          { label: 'Days Active', value: uniqueDays, icon: 'calendar_today' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="glass-panel rounded-xl p-4 text-center glow-edge">
            <span className="material-symbols-outlined text-lg text-primary/60 mb-1 block"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              {icon}
            </span>
            <p className="font-headline font-bold text-3xl text-primary">{value}</p>
            <p className="text-on-surface-variant/60 text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Vividness meter ── */}
      <div className="glass-panel rounded-xl p-5 mb-8 border border-outline-variant/10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-on-surface">Overall Vividness</p>
          <span className="text-xs text-on-surface-variant/50">{vividLabel(avgVividness)}</span>
        </div>
        <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-tertiary"
            initial={{ width: 0 }}
            animate={{ width: `${avgVividness * 100}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="text-[11px] text-on-surface-variant/40 mt-2">
          Based on {sessions.length} {sessions.length === 1 ? 'training' : 'trainings'} across{' '}
          {new Set(sessions.map((s) => s.packageId)).size} practice{new Set(sessions.map((s) => s.packageId)).size !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {(['all', 'anchor', 'earned-moment', 'lighter-you'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-label transition-all duration-300 ${
              filter === f
                ? 'bg-primary/15 text-primary border border-primary/25'
                : 'bg-surface-container text-on-surface-variant/60 border border-outline-variant/15 hover:text-on-surface'
            }`}
          >
            {f === 'all' ? 'All' : PACKAGES[f].label}
          </button>
        ))}
      </div>

      {/* ── Emoji Check-ins ── */}
      <section className="glass-panel rounded-xl p-5 mb-10 border border-outline-variant/10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-headline font-bold text-xl text-on-surface">Emoji Check-ins</h2>
          <p className="text-xs text-on-surface-variant/50 uppercase tracking-wider">
            Mood slider history
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
          {emojiBuckets.map((bucket) => (
            <div
              key={bucket.label}
              className="rounded-lg bg-surface-container p-3 border border-outline-variant/10 text-center"
            >
              <p className="text-2xl mb-1">{bucket.emoji}</p>
              <p className="text-xs text-on-surface-variant/60">{bucket.label}</p>
              <p className="font-headline text-lg text-on-surface mt-1">{bucket.count}</p>
            </div>
          ))}
        </div>

        {recentEmojiCheckins.length > 0 ? (
          <div className="space-y-2">
            {recentEmojiCheckins.map((session) => (
              <div
                key={`emoji-${session.id}`}
                className="rounded-lg px-3 py-2 bg-surface-container-low border border-outline-variant/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMoodEmoji(session.mood)}</span>
                  <div>
                    <p className="text-sm text-on-surface">{getMoodLabel(session.mood)}</p>
                    <p className="text-[11px] text-on-surface-variant/50">{formatDate(session.date)}</p>
                  </div>
                </div>
                <span className="text-[11px] uppercase tracking-wider text-on-surface-variant/45">
                  {PACKAGES[session.packageId].label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant/50">
            No emoji check-ins yet. Complete a training to start tracking mood.
          </p>
        )}
      </section>

      {/* ── Timeline ── */}
      {visible.length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-primary/25 via-primary/10 to-transparent pointer-events-none" />

          <div className="flex flex-col gap-5 pl-11">
            {visible.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                vividness={vividnessMap.get(session.id) ?? 0.5}
                expanded={expandedId === session.id}
                onToggle={() => setExpandedId((id) => (id === session.id ? null : session.id))}
              />
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20"
            style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_stories
          </span>
          <p className="text-on-surface-variant/40 text-sm max-w-xs">
            No entries yet for this practice. Complete a training to begin your storyline.
          </p>
        </motion.div>
      )}
    </div>
  );
}
