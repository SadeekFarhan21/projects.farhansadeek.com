'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMode } from '@/context/mode-provider';
import ModeToggle from './mode-toggle';

export default function Topbar() {
  const pathname = usePathname();
  const { view } = useMode();

  const isSettings = pathname === '/settings';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#080b14]/50 backdrop-blur-xl shadow-[0_20px_40px_0_rgba(205,197,240,0.03)] tonal-bleed">
      <div className="flex justify-between items-center px-8 py-6 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-on-surface font-bold text-lg font-headline">
            Libera
          </Link>
          {/* Streak pill */}
          <div className="hidden md:flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full glow-edge-warm">
            <span className="material-symbols-outlined text-tertiary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="text-sm font-medium text-on-surface-variant">5 Days - Did you spend your 5 mins today?</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!isSettings && <ModeToggle />}
          <Link
            href="/settings"
            className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-all duration-500 scale-95"
          >
            settings
          </Link>
        </div>
      </div>
    </header>
  );
}
