-- ============================================
-- 009_abandon_match.sql - Abandon & expire match functions
-- ============================================

-- Abandon (forfeit) an active match
CREATE OR REPLACE FUNCTION abandon_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_match RECORD;
  v_abandoner UUID;
  v_opponent UUID;
  v_elo_diff INTEGER := 16;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status != 'in_progress' THEN
    RETURN jsonb_build_object('error', 'Match is not in progress');
  END IF;

  v_abandoner := auth.uid();
  IF v_abandoner != v_match.player1_id AND v_abandoner != v_match.player2_id THEN
    RAISE EXCEPTION 'You are not in this match';
  END IF;

  IF v_abandoner = v_match.player1_id THEN
    v_opponent := v_match.player2_id;
  ELSE
    v_opponent := v_match.player1_id;
  END IF;

  UPDATE matches
  SET status = 'abandoned',
      winner_id = v_opponent,
      completed_at = NOW()
  WHERE id = p_match_id;

  UPDATE profiles SET
    elo = GREATEST(elo - v_elo_diff, 100),
    losses = losses + 1
  WHERE id = v_abandoner;

  UPDATE profiles SET
    elo = elo + v_elo_diff,
    wins = wins + 1
  WHERE id = v_opponent;

  RETURN jsonb_build_object('success', true, 'abandoner', v_abandoner, 'winner', v_opponent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expire a stale in_progress match (no ELO changes)
CREATE OR REPLACE FUNCTION expire_stale_match(p_match_id UUID, p_max_age_minutes INTEGER DEFAULT 10)
RETURNS JSONB AS $$
DECLARE
  v_match RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Match not found');
  END IF;

  IF v_match.status != 'in_progress' THEN
    RETURN jsonb_build_object('error', 'Match is not in progress');
  END IF;

  IF auth.uid() != v_match.player1_id AND auth.uid() != v_match.player2_id THEN
    RAISE EXCEPTION 'You are not in this match';
  END IF;

  IF v_match.created_at > NOW() - (p_max_age_minutes || ' minutes')::INTERVAL THEN
    RETURN jsonb_build_object('error', 'Match is not stale', 'stale', false);
  END IF;

  UPDATE matches
  SET status = 'abandoned',
      completed_at = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'expired', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
