'use client';

import type { RoundResult as RoundResultType, PlayerInfo } from '@/lib/types/game';

type RoundResultProps = {
  result: RoundResultType;
  myInfo: PlayerInfo | null;
  opponentInfo: PlayerInfo | null;
};

export function RoundResult({ result, myInfo, opponentInfo }: RoundResultProps) {
  const iWon = result.winnerId === myInfo?.id;
  const opponentWon = result.winnerId === opponentInfo?.id;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4">
        <h2 className={`text-2xl font-bold ${
          iWon ? 'text-green-400' : opponentWon ? 'text-red-400' : 'text-yellow-400'
        }`}>
          {iWon ? 'You win this round!' : opponentWon ? 'Opponent wins!' : 'Draw!'}
        </h2>

        <div className="flex justify-around">
          <div className="space-y-1">
            <p className="text-gray-400 text-sm">{myInfo?.username}</p>
            <p className={`text-lg font-bold ${result.myCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {result.myCorrect ? 'Correct' : 'Wrong'}
            </p>
            {result.myTime && (
              <p className="text-gray-500 text-xs">{result.myTime.toFixed(1)}s</p>
            )}
          </div>
          <div className="w-px bg-gray-700" />
          <div className="space-y-1">
            <p className="text-gray-400 text-sm">{opponentInfo?.username}</p>
            <p className={`text-lg font-bold ${result.opponentCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {result.opponentCorrect ? 'Correct' : 'Wrong'}
            </p>
            {result.opponentTime && (
              <p className="text-gray-500 text-xs">{result.opponentTime.toFixed(1)}s</p>
            )}
          </div>
        </div>

        <p className="text-gray-500 text-sm">
          Correct answer: <span className="text-white font-semibold">{result.correctAnswer}</span>
        </p>
      </div>
    </div>
  );
}
