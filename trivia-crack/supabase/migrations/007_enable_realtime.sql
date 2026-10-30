-- ============================================
-- 007_enable_realtime.sql - Enable Realtime for game tables
-- ============================================

-- Required for postgres_changes subscriptions to work.
-- Without this, matchmaking notifications and game round
-- updates are never delivered to clients.
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_rounds;
