'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { PackageId } from './session-data';

export interface SessionRecord {
  id: string;
  date: string; // ISO string
  packageId: PackageId;
  mood: number; // 0–100
  eftAnswers: string[]; // [A, B, C, D] — up to 4 slots
  journal: { q1: string; q2: string; q3: string };
}

// ── Mock historical data (8 sessions, ~3 weeks) ──
const DAY = 86_400_000;
const now = Date.now();

const MOCK: SessionRecord[] = [
  {
    id: 'mock-0', packageId: 'anchor',
    date: new Date(now - 21 * DAY).toISOString(), mood: 52,
    eftAnswers: ['my bedroom, early light', 'birds outside', 'coffee brewing downstairs', 'the city waking up'],
    journal: { q1: 'quiet', q2: 'sunlight through the curtain', q3: 'choose one small thing' },
  },
  {
    id: 'mock-1', packageId: 'earned-moment',
    date: new Date(now - 18 * DAY).toISOString(), mood: 58,
    eftAnswers: ['finished writing my first draft', 'a steady warmth, like something settled'],
    journal: { q1: 'curious', q2: 'good coffee', q3: 'trust the work' },
  },
  {
    id: 'mock-2', packageId: 'lighter-you',
    date: new Date(now - 15 * DAY).toISOString(), mood: 64,
    eftAnswers: ['speak up without rehearsing', 'free', 'open', 'light'],
    journal: { q1: 'present', q2: 'a clear morning', q3: 'let something go' },
  },
  {
    id: 'mock-3', packageId: 'anchor',
    date: new Date(now - 11 * DAY).toISOString(), mood: 62,
    eftAnswers: ['my kitchen, late afternoon', 'rain on the glass', "a neighbour's dog", 'my own breathing'],
    journal: { q1: 'calm', q2: 'a text from a friend', q3: 'stay present' },
  },
  {
    id: 'mock-4', packageId: 'earned-moment',
    date: new Date(now - 8 * DAY).toISOString(), mood: 70,
    eftAnswers: ['built something that helped people', 'quiet pride, deep in the chest'],
    journal: { q1: 'grounded', q2: 'my health', q3: 'keep going' },
  },
  {
    id: 'mock-5', packageId: 'lighter-you',
    date: new Date(now - 5 * DAY).toISOString(), mood: 72,
    eftAnswers: ['say no without explaining', 'steady', 'clear', 'free'],
    journal: { q1: 'open', q2: 'the smell of rain', q3: 'choose the lighter thing' },
  },
  {
    id: 'mock-6', packageId: 'anchor',
    date: new Date(now - 2 * DAY).toISOString(), mood: 78,
    eftAnswers: ['a small flat with good light', 'the sea somewhere close', 'coffee', 'a silence that feels full'],
    journal: { q1: 'hopeful', q2: 'this practice', q3: 'wake up like this more often' },
  },
  {
    id: 'mock-7', packageId: 'earned-moment',
    date: new Date(now - 0 * DAY).toISOString(), mood: 82,
    eftAnswers: ["launched something I'd been afraid to start", 'a fullness — not relief, completion'],
    journal: { q1: 'alive', q2: 'the sun is out', q3: 'celebrate what you finish' },
  },
];

interface SessionStoreCtx {
  sessions: SessionRecord[];
  saveSession: (record: Omit<SessionRecord, 'id'>) => void;
}

const Ctx = createContext<SessionStoreCtx | null>(null);

export function SessionStoreProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionRecord[]>(MOCK);

  const saveSession = (record: Omit<SessionRecord, 'id'>) => {
    setSessions((prev) => [...prev, { ...record, id: `session-${Date.now()}` }]);
  };

  return <Ctx.Provider value={{ sessions, saveSession }}>{children}</Ctx.Provider>;
}

export function useSessionStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSessionStore must be used inside SessionStoreProvider');
  return ctx;
}
