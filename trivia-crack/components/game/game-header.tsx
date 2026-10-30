'use client';

import { useState } from 'react';
import type { PlayerInfo } from '@/lib/types/game';

type GameHeaderProps = {
  currentRound: number;
  totalRounds: number;
  myInfo: PlayerInfo | null;
  opponentInfo: PlayerInfo | null;
  myScore: number;
  opponentScore: number;
  timeLeft: number;
  opponentAnswered: boolean;
  onAbandon?: () => void;
};

export function GameHeader({
  currentRound,
  totalRounds,
  myInfo,
  opponentInfo,
  myScore,
  opponentScore,
  timeLeft,
  opponentAnswered,
  onAbandon,
}: GameHeaderProps) {
  const isCritical = timeLeft <= 5;
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Leave match */}
      {onAbandon && (
        <div className="flex justify-end mb-2">
          {confirmAbandon ? (
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xs">Forfeit match?</span>
              <button
                onClick={onAbandon}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
              >
                Yes, leave
              </button>
              <button
                onClick={() => setConfirmAbandon(false)}
                className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAbandon(true)}
              className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 text-xs transition-colors"
            >
              Leave Match
            </button>
          )}
        </div>
      )}

      {/* Round indicator */}
      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              i + 1 < currentRound
                ? 'bg-indigo-500'
                : i + 1 === currentRound
                ? 'bg-indigo-400 ring-2 ring-indigo-400/50'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Players and score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">
            {myInfo?.username?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{myInfo?.username ?? 'You'}</p>
            <p className="text-gray-500 text-xs">ELO {myInfo?.elo}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-white">{myScore}</span>
          <span className="text-gray-600 text-xl">-</span>
          <span className="text-3xl font-bold text-white">{opponentScore}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white font-semibold text-sm flex items-center justify-end gap-1">
              {opponentInfo?.username ?? 'Opponent'}
              {opponentAnswered && (
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Answered" />
              )}
            </p>
            <p className="text-gray-500 text-xs">ELO {opponentInfo?.elo}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">
            {opponentInfo?.username?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            isCritical ? 'bg-red-500 timer-critical' : 'bg-indigo-500'
          }`}
          style={{ width: `${(timeLeft / 15) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">Round {currentRound}/{totalRounds}</span>
        <span className={`text-xs font-mono ${isCritical ? 'text-red-400' : 'text-gray-500'}`}>
          {Math.ceil(timeLeft)}s
        </span>
      </div>
    </div>
  );
}
