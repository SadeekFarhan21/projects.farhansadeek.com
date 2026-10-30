'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Match, Question } from '@/lib/types/database';
import type { GamePhase, RoundResult, PlayerInfo } from '@/lib/types/game';
import { useTimer } from './use-timer';

const ROUND_DURATION = 15;
const RESULT_DISPLAY_DURATION = 3000;

export function useGameState(matchId: string) {
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [match, setMatch] = useState<Match | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [myInfo, setMyInfo] = useState<PlayerInfo | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<PlayerInfo | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roundsRef = useRef<Array<{ round_number: number; question_id: string }>>([]);
  const hasSubmittedRef = useRef(false);
  const roundCompletedRef = useRef(0); // Guards against double handleRoundComplete per round
  const handleRoundCompleteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const handleTimeout = useCallback(() => {
    if (!hasSubmittedRef.current && match) {
      submitAnswer(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);

  const timer = useTimer(ROUND_DURATION, handleTimeout);

  // Submit answer via RPC
  const submitAnswer = useCallback(async (answer: string | null) => {
    if (hasSubmittedRef.current || !match) return;
    hasSubmittedRef.current = true;

    const answerTime = answer ? timer.getElapsedSeconds() : ROUND_DURATION;
    setSelectedAnswer(answer);
    timer.stop();
    setPhase('waiting');

    try {
      // Broadcast that we answered (no content, just signal)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_answered',
        payload: { round: currentRound },
      });

      const { data, error: rpcError } = await supabase.rpc('submit_answer', {
        p_match_id: matchId,
        p_round_number: currentRound,
        p_answer: answer ?? 'A', // default to A on timeout
        p_answer_time: answerTime,
      });

      if (rpcError) throw rpcError;

      if (data?.both_answered) {
        await handleRoundComplete();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit answer');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchId, currentRound, timer, supabase]);

  // Handle round completion
  const handleRoundComplete = useCallback(async () => {
    // Guard: prevent duplicate processing for the same round
    if (roundCompletedRef.current >= currentRound) return;
    roundCompletedRef.current = currentRound;

    // Fetch updated round data
    const { data: roundData } = await supabase
      .from('match_rounds')
      .select('*, questions(*)')
      .eq('match_id', matchId)
      .eq('round_number', currentRound)
      .single();

    if (!roundData) return;

    const isPlayer1 = myInfo?.isPlayer1;
    const question = roundData.questions as unknown as Question;

    const result: RoundResult = {
      roundNumber: currentRound,
      myAnswer: isPlayer1 ? roundData.player1_answer : roundData.player2_answer,
      opponentAnswer: isPlayer1 ? roundData.player2_answer : roundData.player1_answer,
      correctAnswer: question.correct_answer,
      myCorrect: isPlayer1 ? roundData.player1_correct : roundData.player2_correct,
      opponentCorrect: isPlayer1 ? roundData.player2_correct : roundData.player1_correct,
      myTime: isPlayer1 ? roundData.player1_answer_time : roundData.player2_answer_time,
      opponentTime: isPlayer1 ? roundData.player2_answer_time : roundData.player1_answer_time,
      winnerId: roundData.round_winner_id,
    };

    // Update scores
    if (result.winnerId === myInfo?.id) {
      setMyScore((s) => s + 1);
    } else if (result.winnerId === opponentInfo?.id) {
      setOpponentScore((s) => s + 1);
    }

    setRoundResult(result);
    setPhase('round_result');

    // Show result for 3 seconds, then advance
    setTimeout(() => {
      if (currentRound >= 5) {
        setPhase('match_complete');
      } else {
        advanceRound(currentRound + 1);
      }
    }, RESULT_DISPLAY_DURATION);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, currentRound, myInfo, opponentInfo, supabase]);

  // Keep ref in sync so the realtime handler always calls the latest version
  handleRoundCompleteRef.current = handleRoundComplete;

  // Advance to next round
  const advanceRound = useCallback(async (nextRound: number) => {
    setCurrentRound(nextRound);
    setSelectedAnswer(null);
    setOpponentAnswered(false);
    hasSubmittedRef.current = false;
    setRoundResult(null);

    const roundInfo = roundsRef.current.find((r) => r.round_number === nextRound);
    if (roundInfo) {
      const { data: question } = await supabase
        .from('questions')
        .select('*')
        .eq('id', roundInfo.question_id)
        .single();

      setCurrentQuestion(question);
    }

    setPhase('answering');
    timer.reset();
    timer.start();
  }, [supabase, timer]);

  // Abandon match (forfeit)
  const abandonMatch = useCallback(async () => {
    if (!match) return;
    try {
      timer.stop();
      const { data, error: rpcError } = await supabase.rpc('abandon_match', {
        p_match_id: matchId,
      });
      if (rpcError) throw new Error(rpcError.message);
      if (data?.error) throw new Error(data.error);
      setPhase('match_abandoned');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to abandon match';
      console.error('Abandon error:', message);
      setError(message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, matchId, timer, supabase]);

  // Initialize game
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Fetch match
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError || !matchData || !mounted) {
          setError('Match not found');
          return;
        }

        setMatch(matchData);
        const isPlayer1 = user.id === matchData.player1_id;
        const opponentId = isPlayer1 ? matchData.player2_id : matchData.player1_id;

        // If match is already completed or abandoned, skip to results
        if (matchData.status === 'completed') {
          setPhase('match_complete');
        }
        if (matchData.status === 'abandoned') {
          setPhase('match_abandoned');
        }

        // Fetch both profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', [user.id, opponentId]);

        if (!profiles || !mounted) return;

        const myProfile = profiles.find((p) => p.id === user.id)!;
        const oppProfile = profiles.find((p) => p.id === opponentId)!;

        setMyInfo({ id: myProfile.id, username: myProfile.username, elo: myProfile.elo, isPlayer1 });
        setOpponentInfo({ id: oppProfile.id, username: oppProfile.username, elo: oppProfile.elo, isPlayer1: !isPlayer1 });

        // Fetch rounds
        const { data: rounds } = await supabase
          .from('match_rounds')
          .select('round_number, question_id')
          .eq('match_id', matchId)
          .order('round_number');

        if (!rounds || !mounted) return;
        roundsRef.current = rounds;

        // Set scores from match data
        setMyScore(isPlayer1 ? matchData.player1_score : matchData.player2_score);
        setOpponentScore(isPlayer1 ? matchData.player2_score : matchData.player1_score);

        // If match already completed or abandoned, don't start game
        if (matchData.status === 'completed' || matchData.status === 'abandoned') return;

        // Fetch first question
        const firstRound = rounds.find((r) => r.round_number === matchData.current_round);
        if (firstRound) {
          const { data: question } = await supabase
            .from('questions')
            .select('*')
            .eq('id', firstRound.question_id)
            .single();

          if (mounted) {
            setCurrentQuestion(question);
            setCurrentRound(matchData.current_round);
          }
        }

        // Set up realtime channel
        const channel = supabase.channel(`match:${matchId}`)
          .on('broadcast', { event: 'player_answered' }, () => {
            setOpponentAnswered(true);
          })
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'match_rounds',
              filter: `match_id=eq.${matchId}`,
            },
            async (payload) => {
              const updated = payload.new;
              // Check if both players answered in the current round
              if (updated.player1_answer && updated.player2_answer) {
                if (hasSubmittedRef.current) {
                  await handleRoundCompleteRef.current();
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'matches',
              filter: `id=eq.${matchId}`,
            },
            (payload) => {
              const updated = payload.new as Match;
              if (updated.status === 'abandoned') {
                timer.stop();
                setMatch(updated);
                setPhase('match_abandoned');
              }
            }
          )
          .subscribe();

        channelRef.current = channel;

        if (mounted && matchData.status !== 'completed') {
          setPhase('answering');
          timer.start();
        }
      } catch (err) {
        console.error('Game init error:', err);
        if (mounted) setError('Failed to load game');
      }
    }

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  return {
    phase,
    match,
    currentQuestion,
    currentRound,
    myInfo,
    opponentInfo,
    myScore,
    opponentScore,
    roundResult,
    selectedAnswer,
    opponentAnswered,
    timer,
    error,
    submitAnswer,
    abandonMatch,
  };
}
