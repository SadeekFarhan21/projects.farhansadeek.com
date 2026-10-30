'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'error';

export function useMatchmaking() {
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [supabase]);

  const joinQueue = useCallback(async () => {
    setStatus('searching');
    setError(null);
    setSearchTime(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's ELO
      const { data: profile } = await supabase
        .from('profiles')
        .select('elo')
        .eq('id', user.id)
        .single();

      // Subscribe to matches table for our user
      const channel = supabase
        .channel('matchmaking')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
          },
          (payload) => {
            const match = payload.new;
            if (match.player1_id === user.id || match.player2_id === user.id) {
              setStatus('found');
              cleanup();
              // Small delay for the "found" animation
              setTimeout(() => {
                router.push(`/game/${match.id}`);
              }, 800);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Start search timer
      timerRef.current = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);

      // Insert into queue (trigger handles matching)
      const { error: queueError } = await supabase
        .from('matchmaking_queue')
        .insert({ user_id: user.id, elo: profile?.elo ?? 1000 });

      if (queueError) {
        if (queueError.code === '23505') {
          // Already in queue — check if match was already created
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id')
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (existingMatch) {
            setStatus('found');
            cleanup();
            router.push(`/game/${existingMatch.id}`);
            return;
          }
        } else {
          throw queueError;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join queue');
      setStatus('error');
      cleanup();
    }
  }, [supabase, router, cleanup]);

  const cancelSearch = useCallback(async () => {
    cleanup();
    try {
      await supabase.rpc('leave_queue');
    } catch {
      // Ignore errors on cancel
    }
    setStatus('idle');
    setSearchTime(0);
  }, [supabase, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { status, error, searchTime, joinQueue, cancelSearch };
}
