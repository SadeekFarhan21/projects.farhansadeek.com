'use client';

import { useMatchmaking } from '@/lib/hooks/use-matchmaking';

export function FindMatchButton() {
  const { status, error, searchTime, joinQueue, cancelSearch } = useMatchmaking();

  if (status === 'searching') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{searchTime}s</span>
          </div>
        </div>
        <p className="text-gray-400">Searching for opponent
          <span className="inline-flex ml-1">
            <span className="searching-dot w-1.5 h-1.5 bg-gray-400 rounded-full inline-block mx-0.5" style={{ animation: 'searching-dot 1.4s infinite ease-in-out both' }} />
            <span className="searching-dot w-1.5 h-1.5 bg-gray-400 rounded-full inline-block mx-0.5" style={{ animation: 'searching-dot 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
            <span className="searching-dot w-1.5 h-1.5 bg-gray-400 rounded-full inline-block mx-0.5" style={{ animation: 'searching-dot 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
          </span>
        </p>
        <button
          onClick={cancelSearch}
          className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (status === 'found') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
          <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-400 font-semibold text-lg">Match found!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      <button
        onClick={joinQueue}
        className="group relative px-12 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
      >
        <span className="flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find Match
        </span>
      </button>
      <p className="text-gray-500 text-sm">BC Calculus - Best of 5</p>
    </div>
  );
}
