'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { KaTeXText } from '@/components/game/katex-text';
import type { Match, MatchRound, Question, Profile } from '@/lib/types/database';
import Link from 'next/link';

type RoundWithQuestion = MatchRound & { questions: Question };

export default function ResultsPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [rounds, setRounds] = useState<RoundWithQuestion[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
  const [isPlayer1, setIsPlayer1] = useState(true);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!matchData) return;
      setMatch(matchData);

      const p1 = user.id === matchData.player1_id;
      setIsPlayer1(p1);

      const opponentId = p1 ? matchData.player2_id : matchData.player1_id;

      const [{ data: profiles }, { data: roundsData }] = await Promise.all([
        supabase.from('profiles').select('*').in('id', [user.id, opponentId]),
        supabase.from('match_rounds').select('*, questions(*)').eq('match_id', matchId).order('round_number'),
      ]);

      setMyProfile(profiles?.find((p) => p.id === user.id) ?? null);
      setOpponentProfile(profiles?.find((p) => p.id === opponentId) ?? null);
      setRounds((roundsData as unknown as RoundWithQuestion[]) ?? []);
      setLoading(false);
    }

    load();
  }, [matchId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!match || !myProfile) return null;

  const myScore = isPlayer1 ? match.player1_score : match.player2_score;
  const oppScore = isPlayer1 ? match.player2_score : match.player1_score;
  const iWon = match.winner_id === myProfile.id;
  const isDraw = match.winner_id === null;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">
        &larr; Back to Dashboard
      </Link>

      {/* Match summary */}
      <div className="text-center mb-8">
        <h1 className={`text-3xl font-bold ${
          iWon ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {iWon ? 'Victory!' : isDraw ? 'Draw' : 'Defeat'}
        </h1>
        <p className="text-4xl font-bold text-white mt-2">{myScore} - {oppScore}</p>
        <p className="text-gray-500 mt-1">
          {myProfile.username} vs {opponentProfile?.username}
        </p>
      </div>

      {/* Round-by-round breakdown */}
      <div className="space-y-4">
        {rounds.map((round) => {
          const question = round.questions;
          const myAnswer = isPlayer1 ? round.player1_answer : round.player2_answer;
          const oppAnswer = isPlayer1 ? round.player2_answer : round.player1_answer;
          const myCorrect = isPlayer1 ? round.player1_correct : round.player2_correct;
          const oppCorrect = isPlayer1 ? round.player2_correct : round.player1_correct;
          const myTime = isPlayer1 ? round.player1_answer_time : round.player2_answer_time;
          const oppTime = isPlayer1 ? round.player2_answer_time : round.player1_answer_time;
          const roundWon = round.round_winner_id === myProfile.id;
          const roundDraw = round.round_winner_id === null;

          return (
            <div key={round.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-400">
                  Round {round.round_number}
                </span>
                <span className={`text-xs px-2 py-1 rounded font-bold ${
                  roundWon ? 'bg-green-900/50 text-green-400' :
                  roundDraw ? 'bg-gray-800 text-gray-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {roundWon ? 'WON' : roundDraw ? 'DRAW' : 'LOST'}
                </span>
              </div>

              <p className="text-white text-sm mb-3">
                <KaTeXText text={question.question_text} />
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">{myProfile.username}</p>
                  <p className={myCorrect ? 'text-green-400' : 'text-red-400'}>
                    {myAnswer ?? 'No answer'} {myCorrect ? '✓' : '✗'}
                  </p>
                  {myTime && <p className="text-gray-600 text-xs">{myTime.toFixed(1)}s</p>}
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">{opponentProfile?.username}</p>
                  <p className={oppCorrect ? 'text-green-400' : 'text-red-400'}>
                    {oppAnswer ?? 'No answer'} {oppCorrect ? '✓' : '✗'}
                  </p>
                  {oppTime && <p className="text-gray-600 text-xs">{oppTime.toFixed(1)}s</p>}
                </div>
              </div>

              <p className="text-gray-500 text-xs mt-2">
                Correct: <span className="text-white">{question.correct_answer}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/dashboard"
          className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors inline-block"
        >
          Play Again
        </Link>
      </div>
    </div>
  );
}
