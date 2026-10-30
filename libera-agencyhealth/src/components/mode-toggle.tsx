'use client';
import { useMode } from '@/context/mode-provider';

export default function ModeToggle() {
  const { mode, setView } = useMode();

  return (
    <div className="flex bg-surface-container rounded-full p-1 glow-edge">
      <button
        onClick={() => setView('sanctuary')}
        className={`px-6 py-1.5 rounded-full text-sm transition-all duration-500 ${
          mode === 'sanctuary'
            ? 'font-semibold text-tertiary bg-tertiary/8'
            : 'font-medium text-on-surface/60 hover:opacity-80'
        }`}
      >
        Sanctuary
      </button>
      <button
        onClick={() => setView('open')}
        className={`px-6 py-1.5 rounded-full text-sm transition-all duration-500 ${
          mode === 'open'
            ? 'font-semibold text-tertiary bg-tertiary/8'
            : 'font-medium text-on-surface/60 hover:opacity-80'
        }`}
      >
        Library
      </button>
    </div>
  );
}
