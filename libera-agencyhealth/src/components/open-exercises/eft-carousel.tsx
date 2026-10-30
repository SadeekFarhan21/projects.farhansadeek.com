'use client';

import { useMemo, useState } from 'react';
import { LIBRARY_EFT_CONFIGS } from '@/lib/library-data';

export function EFTCarousel() {
  const [activeId, setActiveId] = useState<string>(LIBRARY_EFT_CONFIGS[0].id);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [playedBack, setPlayedBack] = useState<Record<string, boolean>>({});

  const active = useMemo(
    () => LIBRARY_EFT_CONFIGS.find((item) => item.id === activeId) ?? LIBRARY_EFT_CONFIGS[0],
    [activeId],
  );
  const values = answers[active.id] ?? Array.from({ length: active.inputs.length }, () => '');

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) => {
      const nextValues = [...(prev[active.id] ?? Array.from({ length: active.inputs.length }, () => ''))];
      nextValues[index] = value;
      return { ...prev, [active.id]: nextValues };
    });
  };

  const submit = () => {
    setPlayedBack((prev) => ({ ...prev, [active.id]: true }));
  };

  const clear = () => {
    setAnswers((prev) => ({ ...prev, [active.id]: Array.from({ length: active.inputs.length }, () => '') }));
    setPlayedBack((prev) => ({ ...prev, [active.id]: false }));
  };

  return (
    <section id="eft" className="mb-12">
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4">EFT</h3>

      <div className="flex gap-4 overflow-x-auto pb-2 mb-5 snap-x snap-mandatory">
        {LIBRARY_EFT_CONFIGS.map((cfg) => (
          <button
            key={cfg.id}
            onClick={() => setActiveId(cfg.id)}
            className={`snap-start min-w-[260px] rounded-2xl p-4 border text-left transition-all ${
              cfg.id === activeId
                ? 'border-primary/40 bg-surface-container'
                : 'border-outline-variant/15 bg-surface-container-low'
            }`}
          >
            <p className={`text-[10px] uppercase tracking-[0.16em] font-bold ${cfg.tagColor}`}>{cfg.target}</p>
            <p className="font-headline font-semibold text-on-surface mt-2">{cfg.title}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-5">
        <p className="text-sm text-on-surface-variant whitespace-pre-line">{active.prompt}</p>

        <div className="mt-4 grid gap-3">
          {active.inputs.map((label, idx) => (
            <label key={label} className="text-sm text-on-surface-variant">
              {label}
              <input
                value={values[idx] ?? ''}
                onChange={(event) => updateAnswer(idx, event.target.value)}
                className="mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-on-surface"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold">
            Build Playback
          </button>
          <button onClick={clear} className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm">
            Reset
          </button>
        </div>

        {playedBack[active.id] && (
          <p className="mt-4 text-sm text-on-surface-variant whitespace-pre-line">
            {active.buildPlayback(values)}
          </p>
        )}
      </div>
    </section>
  );
}
