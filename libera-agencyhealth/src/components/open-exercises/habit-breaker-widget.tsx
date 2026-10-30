'use client';

import { useEffect, useMemo, useState } from 'react';

type FlowStep = 'setup' | 'anchor' | 'contact' | 'trigger' | 'breathe' | 'urge' | 'done';
type TriggerWord = 'anxious' | 'lonely' | 'numb' | 'exhausted' | 'bored' | 'depressed';

interface SetupState {
  anchor: string;
  contactName: string;
  contactPhone: string;
  triggers: string[];
  alternativePlan: string;
}

const DEFAULT_SETUP: SetupState = {
  anchor: '',
  contactName: '',
  contactPhone: '',
  triggers: ['bored', 'anxious', 'depressed', 'lonely'],
  alternativePlan: '',
};

function triggerInstruction(trigger: string) {
  const key = trigger.toLowerCase() as TriggerWord;
  if (key === 'anxious') return 'Cyclic sighing: take a double inhale, then one long slow exhale. Repeat 3 times.';
  if (key === 'lonely' || key === 'numb') return 'Slow diaphragmatic breathing: 4 seconds in, 6 seconds out. Repeat 3 cycles.';
  if (key === 'exhausted') return 'Physiological sigh x2, then one long slow exhale.';
  return 'Slow your breathing and keep your attention on the exhale.';
}

export function HabitBreakerWidget() {
  const [step, setStep] = useState<FlowStep>('setup');
  const [setup, setSetup] = useState<SetupState>(DEFAULT_SETUP);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!secondsLeft || (step !== 'anchor' && step !== 'urge')) return;
    const id = setTimeout(() => {
      setSecondsLeft((current) => {
        const next = current - 1;
        if (next > 0) return next;
        if (step === 'anchor') setStep(setup.contactPhone ? 'contact' : 'trigger');
        return 0;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, step, setup.contactPhone]);

  const canExitUrgeStep = step === 'urge' && secondsLeft === 0;
  const breathInstruction = useMemo(() => triggerInstruction(selectedTrigger), [selectedTrigger]);

  return (
    <section className="mb-12">
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4">Habit Breaker Widget</h3>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-5">
        {step === 'setup' && (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">Set your protocol once, then run it any time cravings hit.</p>
            <input
              value={setup.anchor}
              onChange={(event) => setSetup((prev) => ({ ...prev, anchor: event.target.value }))}
              placeholder="Anchor word or photo description"
              className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
            />
            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={setup.contactName}
                onChange={(event) => setSetup((prev) => ({ ...prev, contactName: event.target.value }))}
                placeholder="Optional contact name"
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
              />
              <input
                value={setup.contactPhone}
                onChange={(event) => setSetup((prev) => ({ ...prev, contactPhone: event.target.value }))}
                placeholder="Optional phone number"
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {setup.triggers.map((trigger, index) => (
                <input
                  key={index}
                  value={trigger}
                  onChange={(event) =>
                    setSetup((prev) => {
                      const triggers = [...prev.triggers];
                      triggers[index] = event.target.value;
                      return { ...prev, triggers };
                    })
                  }
                  placeholder={`Trigger ${index + 1}`}
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
                />
              ))}
            </div>
            <input
              value={setup.alternativePlan}
              onChange={(event) => setSetup((prev) => ({ ...prev, alternativePlan: event.target.value }))}
              placeholder="Alternative plan"
              className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
            />
            <button
              onClick={() => {
                setSecondsLeft(5);
                setStep('anchor');
              }}
              disabled={!setup.anchor || !setup.alternativePlan}
              className="px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold disabled:opacity-50"
            >
              Start Flow
            </button>
          </div>
        )}

        {step === 'anchor' && (
          <div className="text-center py-10">
            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant mb-3">Step 1</p>
            <p className="font-headline text-3xl text-on-surface">{setup.anchor}</p>
            <p className="text-sm text-on-surface-variant mt-3">Hold this for {secondsLeft}s</p>
          </div>
        )}

        {step === 'contact' && (
          <div className="text-center py-8">
            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant mb-3">Step 2</p>
            <p className="font-headline text-2xl text-on-surface">
              Call {setup.contactName || 'Your Contact'}
            </p>
            <p className="text-sm text-on-surface-variant mt-2">{setup.contactPhone}</p>
            <div className="flex justify-center gap-3 mt-5">
              <button className="px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm">Call</button>
              <button className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm">Message</button>
              <button onClick={() => setStep('trigger')} className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'trigger' && (
          <div className="py-6">
            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant mb-3">Step 3</p>
            <p className="font-headline text-xl text-on-surface mb-4">What is strongest right now?</p>
            <div className="grid md:grid-cols-2 gap-3">
              {setup.triggers.map((trigger) => (
                <button
                  key={trigger}
                  onClick={() => {
                    setSelectedTrigger(trigger);
                    setStep('breathe');
                  }}
                  className="px-4 py-3 rounded-lg bg-surface-container-high text-on-surface text-left"
                >
                  {trigger}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'breathe' && (
          <div className="py-8 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant mb-3">Step 4</p>
            <div className="mx-auto mb-4 w-24 h-24 rounded-full border border-primary/40 bg-primary/10 animate-pulse" />
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto">{breathInstruction}</p>
            <button
              onClick={() => {
                setSecondsLeft(10);
                setStep('urge');
              }}
              className="mt-5 px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'urge' && (
          <div className="py-8 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant mb-3">Step 5</p>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              This craving will peak within the next few minutes and then fall. You do not have to fight
              it, just watch it. But if you want to do something, consider: {setup.alternativePlan}
            </p>
            <div className="mt-5 h-8 rounded-full bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 animate-pulse" />
            {canExitUrgeStep ? (
              <button onClick={() => setStep('done')} className="mt-6 px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold">
                I&apos;ve got this
              </button>
            ) : (
              <p className="text-xs text-on-surface-variant mt-4">Exit unlocks in {secondsLeft}s</p>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-10">
            <p className="font-headline text-2xl text-on-surface">Flow complete.</p>
            <button
              onClick={() => {
                setStep('setup');
                setSelectedTrigger('');
                setSetup(DEFAULT_SETUP);
              }}
              className="mt-5 px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-semibold"
            >
              Reset widget
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
