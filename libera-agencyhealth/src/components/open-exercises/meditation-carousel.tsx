'use client';

import { useMemo, useState } from 'react';
import { MEDITATION_SCRIPTS } from '@/lib/library-data';

export function MeditationCarousel() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => MEDITATION_SCRIPTS.find((item) => item.id === activeId) ?? null,
    [activeId],
  );

  return (
    <section id="meditation" className="mb-12">
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4">Meditations</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {MEDITATION_SCRIPTS.map((script) => (
          <article
            key={script.id}
            className="snap-start min-w-[320px] max-w-[360px] rounded-2xl p-5 bg-surface-container-low border border-outline-variant/15"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">{script.icon}</span>
              <p className="font-headline font-semibold text-on-surface">{script.title}</p>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">{script.subtitle}</p>
            <p className="text-xs text-outline mt-3">{script.durations.join(' / ')} min options</p>
            <button
              onClick={() => setActiveId((prev) => (prev === script.id ? null : script.id))}
              className="mt-4 px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold"
            >
              {activeId === script.id ? 'Hide' : 'Open'}
            </button>
          </article>
        ))}
      </div>

      {active && (
        <div className="mt-5 rounded-2xl border border-primary/20 bg-surface-container p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="font-headline text-lg text-on-surface">{active.title}</p>
            <audio controls preload="none" className="max-w-[220px]">
              <source src="" />
            </audio>
          </div>
          <p className="text-sm text-on-surface-variant whitespace-pre-line line-clamp-6">{active.script}</p>
        </div>
      )}
    </section>
  );
}
