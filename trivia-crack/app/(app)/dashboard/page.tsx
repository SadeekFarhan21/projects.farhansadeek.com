'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FindMatchButton } from '@/components/game/find-match-button';
import type { Profile, Match } from '@/lib/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentMatches, setRecentMatches] = useState<(Match & { opponent: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch recent matches
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (matches && matches.length > 0) {
        // Get opponent IDs
        const opponentIds = matches.map((m) =>
          m.player1_id === user.id ? m.player2_id : m.player1_id
        );

        const { data: opponents } = await supabase
          .from('profiles')
          .select('*')
          .in('id', opponentIds);

        const matchesWithOpponents = matches.map((m) => ({
          ...m,
          opponent: opponents?.find((o) =>
            o.id === (m.player1_id === user.id ? m.player2_id : m.player1_id)
          ) as Profile,
        }));

        setRecentMatches(matchesWithOpponents);
      }

      // Check for active in-progress match
      const { data: activeMatch } = await supabase
        .from('matches')
        .select('id, created_at')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'in_progress')
        .limit(1)
        .single();

      if (activeMatch) {
        const matchAge = Date.now() - new Date(activeMatch.created_at).getTime();
        const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

        if (matchAge > STALE_THRESHOLD_MS) {
          // Auto-expire stale match
          const { data: expireResult } = await supabase.rpc('expire_stale_match', {
            p_match_id: activeMatch.id,
          });
          if (!expireResult?.success) {
            // Expiration failed, redirect to game as fallback
            router.push(`/game/${activeMatch.id}`);
            return;
          }
        } else {
          router.push(`/game/${activeMatch.id}`);
          return;
        }
      }

      setLoading(false);
    }

    load();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Trivia Crack</h1>
          <p className="text-gray-500 text-sm">AP BC Calculus</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/leaderboard"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Leaderboard
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
              router.refresh();
            }}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">{profile.elo}</p>
            <p className="text-gray-500 text-sm">ELO Rating</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{profile.wins}</p>
            <p className="text-gray-500 text-sm">Wins</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{profile.losses}</p>
            <p className="text-gray-500 text-sm">Losses</p>
          </div>
        </div>
      )}

      {/* Find Match */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 mb-8 flex justify-center">
        <FindMatchButton />
      </div>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Matches</h2>
          <div className="space-y-3">
            {recentMatches.map((match) => {
              const isPlayer1 = match.player1_id === profile?.id;
              const myScore = isPlayer1 ? match.player1_score : match.player2_score;
              const oppScore = isPlayer1 ? match.player2_score : match.player1_score;
              const won = match.winner_id === profile?.id;
              const draw = match.winner_id === null;

              return (
                <Link
                  key={match.id}
                  href={`/results/${match.id}`}
                  className="block bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        won ? 'bg-green-900/50 text-green-400' :
                        draw ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {won ? 'WIN' : draw ? 'DRAW' : 'LOSS'}
                      </span>
                      <span className="text-white">vs {match.opponent?.username ?? 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold">{myScore} - {oppScore}</span>
                      <span className="text-gray-600 text-sm">
                        {match.completed_at
                          ? new Date(match.completed_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
