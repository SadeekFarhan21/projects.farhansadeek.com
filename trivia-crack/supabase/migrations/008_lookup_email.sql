-- ============================================
-- 008_lookup_email.sql - Resolve username/user ID to email for login
-- ============================================

-- Allows login by username or user ID by looking up the associated email.
-- SECURITY DEFINER is required to read from auth.users.
CREATE OR REPLACE FUNCTION lookup_email(p_identifier TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
  v_user_id UUID;
BEGIN
  -- If it looks like a UUID, look up by user ID
  BEGIN
    v_user_id := p_identifier::UUID;
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    IF FOUND THEN RETURN v_email; END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- Not a UUID, continue
  END;

  -- Otherwise, look up by username
  SELECT au.email INTO v_email
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE LOWER(p.username) = LOWER(p_identifier);

  RETURN v_email; -- NULL if not found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
