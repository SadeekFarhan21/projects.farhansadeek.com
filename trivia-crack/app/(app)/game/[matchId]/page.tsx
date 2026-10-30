'use client';

import { useParams } from 'next/navigation';
import { useGameState } from '@/lib/hooks/use-game-state';
import { GameHeader } from '@/components/game/game-header';
import { QuestionCard } from '@/components/game/question-card';
import { RoundResult } from '@/components/game/round-result';
import { MatchResult } from '@/components/game/match-result';

export default function GamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const game = useGameState(matchId);

  if (game.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{game.error}</p>
          <a href="/dashboard" className="text-indigo-400 hover:underline mt-4 inline-block">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (game.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (game.phase === 'match_abandoned') {
    const iAbandoned = game.match?.winner_id !== game.myInfo?.id;
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className={`text-3xl font-bold ${iAbandoned ? 'text-red-400' : 'text-green-400'}`}>
            {iAbandoned ? 'Match Forfeited' : 'Opponent Left'}
          </h1>
          <p className="text-gray-400">
            {iAbandoned
              ? 'You left the match. Your opponent wins by default.'
              : 'Your opponent abandoned the match. You win by default!'}
          </p>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">
              ELO Change:{' '}
              <span className={`font-bold ${iAbandoned ? 'text-red-400' : 'text-green-400'}`}>
                {iAbandoned ? '-16' : '+16'}
              </span>
            </p>
          </div>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (game.phase === 'match_complete') {
    return (
      <MatchResult
        matchId={matchId}
        myScore={game.myScore}
        opponentScore={game.opponentScore}
        myInfo={game.myInfo}
        opponentInfo={game.opponentInfo}
        winnerId={game.match?.winner_id ?? null}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <GameHeader
        currentRound={game.currentRound}
        totalRounds={5}
        myInfo={game.myInfo}
        opponentInfo={game.opponentInfo}
        myScore={game.myScore}
        opponentScore={game.opponentScore}
        timeLeft={game.timer.timeLeft}
        opponentAnswered={game.opponentAnswered}
        onAbandon={game.abandonMatch}
      />

      <div className="flex-1 flex items-center justify-center py-8">
        {game.currentQuestion && (
          <QuestionCard
            question={game.currentQuestion}
            selectedAnswer={game.selectedAnswer}
            showResult={game.phase === 'round_result'}
            correctAnswer={game.roundResult?.correctAnswer}
            disabled={game.phase !== 'answering'}
            onAnswer={(answer) => game.submitAnswer(answer)}
          />
        )}
      </div>

      {/* Waiting overlay */}
      {game.phase === 'waiting' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-full px-6 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-gray-300 text-sm">Waiting for opponent...</span>
        </div>
      )}

      {/* Round result overlay */}
      {game.phase === 'round_result' && game.roundResult && (
        <RoundResult
          result={game.roundResult}
          myInfo={game.myInfo}
          opponentInfo={game.opponentInfo}
        />
      )}
    </div>
  );
}
