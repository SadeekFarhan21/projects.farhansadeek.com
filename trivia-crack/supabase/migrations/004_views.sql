-- ============================================
-- 004_views.sql - Safe views hiding opponent data
-- ============================================

-- Safe match rounds view: hides opponent's answer until both have answered
CREATE OR REPLACE VIEW safe_match_rounds AS
SELECT
  mr.id,
  mr.match_id,
  mr.round_number,
  mr.question_id,
  -- Show own answer always, opponent only if both answered
  CASE
    WHEN auth.uid() = m.player1_id THEN mr.player1_answer
    WHEN auth.uid() = m.player2_id THEN mr.player2_answer
  END AS my_answer,
  CASE
    WHEN auth.uid() = m.player1_id THEN mr.player1_answer_time
    WHEN auth.uid() = m.player2_id THEN mr.player2_answer_time
  END AS my_answer_time,
  CASE
    WHEN auth.uid() = m.player1_id THEN mr.player1_correct
    WHEN auth.uid() = m.player2_id THEN mr.player2_correct
  END AS my_correct,
  -- Opponent data only visible when both answered
  CASE
    WHEN mr.player1_answer IS NOT NULL AND mr.player2_answer IS NOT NULL THEN
      CASE
        WHEN auth.uid() = m.player1_id THEN mr.player2_answer
        WHEN auth.uid() = m.player2_id THEN mr.player1_answer
      END
  END AS opponent_answer,
  CASE
    WHEN mr.player1_answer IS NOT NULL AND mr.player2_answer IS NOT NULL THEN
      CASE
        WHEN auth.uid() = m.player1_id THEN mr.player2_answer_time
        WHEN auth.uid() = m.player2_id THEN mr.player1_answer_time
      END
  END AS opponent_answer_time,
  CASE
    WHEN mr.player1_answer IS NOT NULL AND mr.player2_answer IS NOT NULL THEN
      CASE
        WHEN auth.uid() = m.player1_id THEN mr.player2_correct
        WHEN auth.uid() = m.player2_id THEN mr.player1_correct
      END
  END AS opponent_correct,
  (mr.player1_answer IS NOT NULL AND mr.player2_answer IS NOT NULL) AS both_answered,
  mr.round_winner_id,
  mr.created_at
FROM match_rounds mr
JOIN matches m ON m.id = mr.match_id
WHERE m.player1_id = auth.uid() OR m.player2_id = auth.uid();
