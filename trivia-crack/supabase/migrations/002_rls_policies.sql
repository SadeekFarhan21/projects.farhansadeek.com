-- ============================================
-- 002_rls_policies.sql - Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_rounds ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users can update own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Questions: anyone can read
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT USING (true);

-- Matchmaking queue: users can insert/delete own entry
CREATE POLICY "Users can join queue"
  ON matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave queue"
  ON matchmaking_queue FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own queue entry"
  ON matchmaking_queue FOR SELECT USING (auth.uid() = user_id);

-- Matches: players can view their own matches
CREATE POLICY "Players can view their matches"
  ON matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Match rounds: players can view rounds for their matches
CREATE POLICY "Players can view their match rounds"
  ON match_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_rounds.match_id
        AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );
