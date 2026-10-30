'use client';

import { useMemo, useState } from 'react';
import { BREATHWORK_CARDS } from '@/lib/library-data';

function BreathPulse({ active }: { active: boolean }) {
  return (
    <div className="relative h-32 w-32 flex items-center justify-center">
      <div className={`absolute inset-0 rounded-full bg-primary/10 ${active ? 'animate-ping' : ''}`} />
      <div className={`h-16 w-16 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/30 ${active ? 'animate-pulse' : ''}`} />
    </div>
  );
}

export function BreathworkCarousel() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => BREATHWORK_CARDS.find((card) => card.id === activeId) ?? null,
    [activeId],
  );

  return (
    <section id="breathwork" className="mb-12">
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4">Breathworks</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {BREATHWORK_CARDS.map((card) => (
          <article
            key={card.id}
            className="snap-start min-w-[320px] max-w-[360px] rounded-2xl p-5 bg-surface-container-low border border-outline-variant/15"
          >
            <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${card.tagColor}`}>{card.tag}</p>
            <p className="text-xs text-outline mt-1">{card.duration}</p>
            <p className="font-headline font-semibold text-on-surface mt-3">{card.title}</p>
            <p className="text-sm text-on-surface-variant mt-2">{card.description}</p>
            <button
              onClick={() => setActiveId((prev) => (prev === card.id ? null : card.id))}
              className="mt-4 px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold"
            >
              {activeId === card.id ? 'Stop' : 'Practice'}
            </button>
          </article>
        ))}
      </div>

      {active && (
        <div className="mt-5 rounded-2xl border border-primary/20 bg-surface-container p-5 flex flex-col md:flex-row items-center gap-5">
          <BreathPulse active />
          <div>
            <p className="font-headline text-xl text-on-surface">{active.title}</p>
            <p className="text-sm text-on-surface-variant mt-2">{active.instruction}</p>
            <p className="text-xs text-outline mt-2">
              {active.doubleInhale ? 'Double inhale + long exhale' : `${active.inhale}s inhale`}
              {active.holdIn ? ` · ${active.holdIn}s hold` : ''}
              {` · ${active.exhale}s exhale`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
