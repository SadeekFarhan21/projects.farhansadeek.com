'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export type View = 'sanctuary' | 'open';

type ModeCtxVal = {
  view: View;
  setView: (v: View) => void;
  mode: 'sanctuary' | 'open';
};

const ModeCtx = createContext<ModeCtxVal | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('sanctuary');
  const mode = view === 'open' ? 'open' : 'sanctuary';
  return (
    <ModeCtx.Provider value={{ view, setView, mode }}>
      {children}
    </ModeCtx.Provider>
  );
}

export const useMode = () => {
  const ctx = useContext(ModeCtx);
  if (!ctx) throw new Error('useMode must be used inside ModeProvider');
  return ctx;
};
