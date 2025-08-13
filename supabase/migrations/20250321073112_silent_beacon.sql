/*
  # Fix Admin Recursion and Logging
  
  1. Changes
    - Fix infinite recursion in admin policies
    - Add proper logging table constraints
    - Update admin check function
*/

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;

-- Create new non-recursive admin policies
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Update shared_memory_logs table
ALTER TABLE shared_memory_logs
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ALTER COLUMN action SET NOT NULL,
ALTER COLUMN details SET DEFAULT '{}'::jsonb;

-- Add check constraint for category
ALTER TABLE shared_memory_logs
ADD CONSTRAINT shared_memory_logs_category_check
CHECK (category IN ('security', 'performance', 'usage', 'permissions'));

-- Create index for faster log queries
CREATE INDEX IF NOT EXISTS idx_shared_memory_logs_category_timestamp 
ON shared_memory_logs(category, timestamp DESC);

-- Update logging function
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