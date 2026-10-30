'use client';

import { BreathworkCarousel } from '@/components/open-exercises/breathwork-carousel';
import { EFTCarousel } from '@/components/open-exercises/eft-carousel';
import { HabitBreakerWidget } from '@/components/open-exercises/habit-breaker-widget';
import { MeditationCarousel } from '@/components/open-exercises/meditation-carousel';
import { SuggestionsCarousel } from '@/components/open-exercises/suggestions-carousel';

export default function OpenMode() {
  return (
    <div className="max-w-7xl mx-auto">
      <section className="mb-10">
        <p className="text-tertiary font-label text-sm tracking-[0.2em] uppercase mb-3 block">
          Open Exercises
        </p>
        <h1 className="font-headline font-bold text-4xl md:text-5xl text-on-surface leading-snug max-w-3xl">
          Browse a modular set of breathwork, meditation, EFT, and craving-interrupt practices.
        </h1>
      </section>

      <SuggestionsCarousel />
      <BreathworkCarousel />
      <MeditationCarousel />
      <EFTCarousel />
      <HabitBreakerWidget />
    </div>
  );
}
