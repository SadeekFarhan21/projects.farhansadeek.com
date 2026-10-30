'use client';

import type { PlayerInfo } from '@/lib/types/game';
import Link from 'next/link';

type MatchResultProps = {
  matchId: string;
  myScore: number;
  opponentScore: number;
  myInfo: PlayerInfo | null;
  opponentInfo: PlayerInfo | null;
  winnerId: string | null;
};

export function MatchResult({ matchId, myScore, opponentScore, myInfo, opponentInfo, winnerId }: MatchResultProps) {
  const iWon = winnerId === myInfo?.id;
  const isDraw = winnerId === null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className={`text-6xl ${iWon ? '' : isDraw ? '' : ''}`}>
          {iWon ? '🏆' : isDraw ? '🤝' : '😢'}
        </div>

        <h1 className={`text-4xl font-bold ${
          iWon ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {iWon ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}
        </h1>

        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {myInfo?.username?.charAt(0).toUpperCase()}
            </div>
            <p className="text-white font-semibold">{myInfo?.username}</p>
          </div>

          <div className="text-center">
            <p className="text-5xl font-bold text-white">
              {myScore} <span className="text-gray-600">-</span> {opponentScore}
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {opponentInfo?.username?.charAt(0).toUpperCase()}
            </div>
            <p className="text-white font-semibold">{opponentInfo?.username}</p>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            ELO Change: <span className={`font-bold ${iWon ? 'text-green-400' : isDraw ? 'text-gray-400' : 'text-red-400'}`}>
              {iWon ? '+16' : isDraw ? '±0' : '-16'}
            </span>
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href={`/results/${matchId}`}
            className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition-colors"
          >
            View Details
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Play Again
          </Link>
        </div>
      </div>
    </div>
  );
}
