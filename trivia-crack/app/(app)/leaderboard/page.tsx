'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types/database';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('elo', { ascending: false })
        .limit(50);

      setPlayers(data ?? []);
      setLoading(false);
    }

    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm mb-6 inline-block">
        &larr; Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">Leaderboard</h1>

      <div className="space-y-2">
        {players.map((player, index) => {
          const isMe = player.id === myId;
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isMe
                  ? 'bg-indigo-900/20 border-indigo-500/50'
                  : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-8 text-center text-gray-500 font-mono text-sm">
                  {medal ?? `#${index + 1}`}
                </span>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                  {player.username.charAt(0).toUpperCase()}
                </div>
                <span className={`font-medium ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                  {player.username} {isMe && '(you)'}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-white font-bold">{player.elo}</p>
                  <p className="text-xs text-gray-500">ELO</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-400">{player.wins}W</p>
                  <p className="text-sm text-red-400">{player.losses}L</p>
                </div>
              </div>
            </div>
          );
        })}

        {players.length === 0 && (
          <p className="text-gray-500 text-center py-8">No players yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}
