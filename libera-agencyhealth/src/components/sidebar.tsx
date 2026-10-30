'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useMode, type View } from '@/context/mode-provider';

const NAV: { id: View | 'insights'; icon: string; label: string }[] = [
  { id: 'sanctuary', icon: 'spa', label: 'Sanctuary' },
  { id: 'insights', icon: 'insights', label: 'Insights' },
  { id: 'open', icon: 'wb_sunny', label: 'Library' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { view, setView } = useMode();

  const onHome = pathname === '/';
  const onInsights = pathname === '/insights';

  function go(id: (typeof NAV)[number]['id']) {
    if (id === 'insights') {
      router.push('/insights');
      return;
    }
    if (!onHome) router.push('/');
    setView(id);
  }

  function isActive(id: (typeof NAV)[number]['id']) {
    if (id === 'insights') return onInsights;
    return onHome && view === id;
  }

  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 w-64 p-8 gap-12 bg-surface-container-low transition-colors">
      <div className="flex flex-col gap-1 mt-20">
        <h1 className="text-on-surface font-bold text-xl font-headline tracking-wide">Libera</h1>
        <p className="text-tertiary text-xs font-medium">5 Day Streak</p>
      </div>

      <nav className="flex flex-col gap-4">
        {NAV.map((item) => {
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-500 ${
                active
                  ? 'text-primary font-bold border-r-2 border-tertiary shadow-[2px_0_12px_rgba(212,165,116,0.15)]'
                  : 'text-outline-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-headline tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-4 p-4 bg-surface-container rounded-2xl glow-edge">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tertiary/30 to-secondary/30 border border-outline-variant/20 shrink-0" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold truncate">Alex Rivera</span>
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-50">
            Zen Master
          </span>
        </div>
      </div>
    </aside>
  );
}
