'use client';

import { SUGGESTION_CARDS } from '@/lib/library-data';

export function SuggestionsCarousel() {
  const jumpToSection = (sectionId: string) => {
    if (!sectionId) return;
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="mb-10">
      <p className="text-tertiary font-label text-xs tracking-[0.2em] uppercase mb-2 block">
        Top Suggestions
      </p>
      <h2 className="text-xl font-headline font-bold text-on-surface mb-4">
        Apple Health + Mood Data suggests you might be feeling... Try...
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {SUGGESTION_CARDS.map((card) => (
          <button
            key={card.title}
            onClick={() => jumpToSection(card.sectionId)}
            className="snap-start min-w-[280px] max-w-[300px] rounded-2xl p-5 bg-surface-container-low border border-outline-variant/15 hover:border-outline-variant/30 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center ${card.tint} mb-4`}>
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <p className="font-headline font-semibold text-on-surface">{card.title}</p>
            <p className="text-sm text-on-surface-variant mt-1">{card.reason}</p>
            <p className="text-xs text-outline mt-3 uppercase tracking-wide">{card.duration}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
