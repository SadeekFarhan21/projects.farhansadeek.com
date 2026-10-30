'use client';
import { useState, useTransition } from 'react';
import { updateFilters, type Filters } from '@/app/actions/filters';

const ITEMS: {
  key: keyof Filters;
  label: string;
  hint: string;
  icon: string;
  stateLabel: (on: boolean) => string;
}[] = [
  {
    key: 'blackAndWhite',
    label: 'Black and White Mode',
    hint: 'Removes visual rewards from app icons and content feeds.',
    icon: 'contrast',
    stateLabel: (on) => (on ? 'Enabled' : 'Disabled'),
  },
  {
    key: 'halfSpeedScroll',
    label: 'Half-Speed Scrolling',
    hint: 'Introduces friction to infinite feeds to discourage mindless usage.',
    icon: 'slow_motion_video',
    stateLabel: (on) => (on ? 'Enabled' : 'Disabled'),
  },
  {
    key: 'restrictNotifications',
    label: 'Restrict Notifications',
    hint: 'Only allows critical alerts from priority contacts to pass through.',
    icon: 'notifications_off',
    stateLabel: (on) => (on ? 'Active' : 'Inactive'),
  },
];

export default function FilterToggles({
  initial,
  authed,
}: {
  initial: Filters;
  authed: boolean;
}) {
  const [state, setState] = useState<Filters>(initial);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof Filters) {
    const prev = state;
    const next = { ...state, [key]: !state[key] };
    setState(next);
    if (!authed) return;
    startTransition(async () => {
      try {
        await updateFilters(next);
      } catch {
        setState(prev);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {ITEMS.map((item) => {
        const on = state[item.key];
        return (
          <div
            key={item.key}
            className="glass-panel p-8 rounded-xl glow-edge flex flex-col justify-between group"
          >
            <div className="mb-12">
              <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-primary-dim">{item.icon}</span>
              </div>
              <h4 className="text-on-surface font-headline font-bold text-xl mb-2">{item.label}</h4>
              <p className="text-on-surface-variant text-xs leading-relaxed">{item.hint}</p>
            </div>
            <div className="flex items-center">
              <label className="inline-flex items-center cursor-pointer">
                <button
                  onClick={() => toggle(item.key)}
                  disabled={pending}
                  className={`relative w-11 h-5 rounded-full transition-colors duration-500 ${
                    on ? 'bg-tertiary' : 'bg-outline-variant/40'
                  }`}
                  aria-pressed={on}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-500 ${
                      on ? 'translate-x-6 bg-on-tertiary-fixed' : 'translate-x-0.5 bg-on-surface'
                    }`}
                  />
                </button>
                <span
                  className={`ml-3 text-[10px] font-bold tracking-widest uppercase ${
                    on ? 'text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  {item.stateLabel(on)}
                </span>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
