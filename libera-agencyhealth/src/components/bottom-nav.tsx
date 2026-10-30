'use client';

const ITEMS = [
  { icon: 'navigation', label: 'Journey' },
  { icon: 'trip_origin', label: 'Zen', active: true },
  { icon: 'person', label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 w-full flex justify-around items-center px-12 pb-8 pt-4 bg-surface-container/80 backdrop-blur-2xl rounded-t-[3rem] shadow-[0_-8px_30px_rgba(212,165,116,0.04)] z-50">
      {ITEMS.map((item) => (
        <button
          key={item.label}
          className={`flex flex-col items-center justify-center p-4 transition-all duration-700 ${
            item.active
              ? 'bg-tertiary/8 text-tertiary rounded-full scale-105'
              : 'text-outline-variant hover:bg-surface-bright'
          }`}
        >
          <span
            className="material-symbols-outlined mb-1"
            style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
