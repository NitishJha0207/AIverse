-- Drop existing function
DROP FUNCTION IF EXISTS log_shared_memory_action(uuid, uuid, text, text, jsonb, jsonb);

-- Create or replace function with user creation
CREATE OR REPLACE FUNCTION log_shared_memory_action(
  p_user_id uuid,
  p_app_id uuid,
  p_category text,
  p_action text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Validate category
  IF p_category NOT IN ('security', 'performance', 'usage', 'permissions') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;

  -- Ensure user exists in users table
  INSERT INTO users (id, email)
  SELECT p_user_id, auth.email()
  WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id
  );

  -- Log the action
  INSERT INTO shared_memory_logs (
    user_id,
    app_id,
    category,
    action,
    details,
    metadata,
    timestamp
  ) VALUES (
    p_user_id,
    p_app_id,
    p_category,
    p_action,
    p_details,
    p_metadata,
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;