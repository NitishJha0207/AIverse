/*
  # Fix App Tracking System
  
  1. Changes
    - Drop and recreate shared_memory_logs table with correct schema
    - Add proper RLS policies
    - Create helper function for logging
    - Add indexes for performance
*/

-- Drop existing table and function
DROP TABLE IF EXISTS shared_memory_logs CASCADE;
DROP FUNCTION IF EXISTS log_shared_memory_action CASCADE;

-- Create shared_memory_logs table
CREATE TABLE shared_memory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id uuid REFERENCES app_listings(id),
  action text NOT NULL,
  category text NOT NULL CHECK (category IN ('security', 'performance', 'usage', 'permissions')),
  details jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shared_memory_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their memory logs"
  ON shared_memory_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their memory logs"
  ON shared_memory_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_shared_memory_logs_user_app ON shared_memory_logs(user_id, app_id);
CREATE INDEX idx_shared_memory_logs_timestamp ON shared_memory_logs(timestamp DESC);
CREATE INDEX idx_shared_memory_logs_category ON shared_memory_logs(category);

-- Create logging function
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

  -- Insert log entry
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