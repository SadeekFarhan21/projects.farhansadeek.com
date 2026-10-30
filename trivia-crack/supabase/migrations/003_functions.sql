-- ============================================
-- 003_functions.sql - RPC functions
-- ============================================

-- Matchmaking trigger: atomically pair players
CREATE OR REPLACE FUNCTION try_create_match()
RETURNS TRIGGER AS $$
DECLARE
  opponent RECORD;
  new_match_id UUID;
  question_ids UUID[];
BEGIN
  -- Try to find another player in the queue (not self)
  SELECT * INTO opponent
  FROM matchmaking_queue
  WHERE user_id != NEW.user_id
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No opponent found, just let the insert happen
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Pick 5 random questions
  SELECT ARRAY(
    SELECT id FROM questions ORDER BY random() LIMIT 5
  ) INTO question_ids;

  -- Create match
  INSERT INTO matches (player1_id, player2_id, status)
  VALUES (opponent.user_id, NEW.user_id, 'in_progress')
  RETURNING id INTO new_match_id;

  -- Create 5 rounds
  FOR i IN 1..5 LOOP
    INSERT INTO match_rounds (match_id, round_number, question_id)
    VALUES (new_match_id, i, question_ids[i]);
  END LOOP;

  -- Remove both players from queue
  DELETE FROM matchmaking_queue WHERE user_id = opponent.user_id;
  DELETE FROM matchmaking_queue WHERE user_id = NEW.user_id;

  RETURN NULL; -- Prevent the INSERT for the new player since we deleted them
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_queue_insert
  AFTER INSERT ON matchmaking_queue
  FOR EACH ROW EXECUTE FUNCTION try_create_match();

-- Submit answer RPC
CREATE OR REPLACE FUNCTION submit_answer(
  p_match_id UUID,
  p_round_number INTEGER,
  p_answer TEXT,
  p_answer_time REAL
)
RETURNS JSONB AS $$
DECLARE
  v_match RECORD;
  v_round RECORD;
  v_question RECORD;
  v_is_player1 BOOLEAN;
  v_is_correct BOOLEAN;
  v_both_answered BOOLEAN;
  v_round_winner UUID;
BEGIN
  -- Get match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Determine which player
  IF auth.uid() = v_match.player1_id THEN
    v_is_player1 := true;
  ELSIF auth.uid() = v_match.player2_id THEN
    v_is_player1 := false;
  ELSE
    RAISE EXCEPTION 'You are not in this match';
  END IF;

  -- Get round
  SELECT * INTO v_round
  FROM match_rounds
  WHERE match_id = p_match_id AND round_number = p_round_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round not found';
  END IF;

  -- Check if already answered
  IF v_is_player1 AND v_round.player1_answer IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already answered');
  END IF;
  IF NOT v_is_player1 AND v_round.player2_answer IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already answered');
  END IF;

  -- Check correctness
  SELECT * INTO v_question FROM questions WHERE id = v_round.question_id;
  v_is_correct := (p_answer = v_question.correct_answer);

  -- Update round
  IF v_is_player1 THEN
    UPDATE match_rounds
    SET player1_answer = p_answer,
        player1_answer_time = p_answer_time,
        player1_correct = v_is_correct
    WHERE id = v_round.id;
  ELSE
    UPDATE match_rounds
    SET player2_answer = p_answer,
        player2_answer_time = p_answer_time,
        player2_correct = v_is_correct
    WHERE id = v_round.id;
  END IF;

  -- Re-fetch round to check if both answered
  SELECT * INTO v_round
  FROM match_rounds
  WHERE match_id = p_match_id AND round_number = p_round_number;

  v_both_answered := (v_round.player1_answer IS NOT NULL AND v_round.player2_answer IS NOT NULL);

  -- If both answered, determine round winner
  IF v_both_answered THEN
    IF v_round.player1_correct AND NOT v_round.player2_correct THEN
      v_round_winner := v_match.player1_id;
    ELSIF NOT v_round.player1_correct AND v_round.player2_correct THEN
      v_round_winner := v_match.player2_id;
    ELSIF v_round.player1_correct AND v_round.player2_correct THEN
      -- Both correct: faster wins
      IF v_round.player1_answer_time <= v_round.player2_answer_time THEN
        v_round_winner := v_match.player1_id;
      ELSE
        v_round_winner := v_match.player2_id;
      END IF;
    END IF;
    -- Both wrong: no winner (NULL)

    UPDATE match_rounds SET round_winner_id = v_round_winner WHERE id = v_round.id;

    -- Update match scores
    IF v_round_winner = v_match.player1_id THEN
      UPDATE matches SET player1_score = player1_score + 1, current_round = LEAST(p_round_number + 1, 5) WHERE id = p_match_id;
    ELSIF v_round_winner = v_match.player2_id THEN
      UPDATE matches SET player2_score = player2_score + 1, current_round = LEAST(p_round_number + 1, 5) WHERE id = p_match_id;
    ELSE
      UPDATE matches SET current_round = LEAST(p_round_number + 1, 5) WHERE id = p_match_id;
    END IF;

    -- Check if match is over (round 5 completed)
    IF p_round_number = 5 THEN
      PERFORM complete_match(p_match_id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'correct', v_is_correct,
    'both_answered', v_both_answered,
    'round_winner', v_round_winner
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete match function
CREATE OR REPLACE FUNCTION complete_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_match RECORD;
  v_winner UUID;
  v_loser UUID;
  v_elo_diff INTEGER;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  -- Determine winner
  IF v_match.player1_score > v_match.player2_score THEN
    v_winner := v_match.player1_id;
    v_loser := v_match.player2_id;
  ELSIF v_match.player2_score > v_match.player1_score THEN
    v_winner := v_match.player2_id;
    v_loser := v_match.player1_id;
  END IF;
  -- If tie, no winner

  UPDATE matches
  SET status = 'completed',
      winner_id = v_winner,
      completed_at = NOW()
  WHERE id = p_match_id;

  -- Update ELO (simple K=32 system)
  IF v_winner IS NOT NULL THEN
    v_elo_diff := 16; -- Simplified: always +/- 16

    UPDATE profiles SET
      elo = elo + v_elo_diff,
      wins = wins + 1
    WHERE id = v_winner;

    UPDATE profiles SET
      elo = GREATEST(elo - v_elo_diff, 100),
      losses = losses + 1
    WHERE id = v_loser;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave queue function
CREATE OR REPLACE FUNCTION leave_queue()
RETURNS VOID AS $$
BEGIN
  DELETE FROM matchmaking_queue WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
