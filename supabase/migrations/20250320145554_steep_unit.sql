/*
  # Error Logging System

  1. New Tables
    - `error_logs`: Stores application errors and logs
      - User-specific error tracking
      - Component and context information
      - Error details and stack traces
      - Metadata for debugging

  2. Security
    - Enable RLS
    - Add policies for user access
    - Admin access for all logs
*/

-- Create error_logs table
CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  level text NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  component text,
  message text NOT NULL,
  error_details jsonb DEFAULT '{}'::jsonb,
  stack_trace text,
  metadata jsonb DEFAULT '{}'::jsonb,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  is_resolved boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_component ON error_logs(component);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_resolved ON error_logs(is_resolved, resolved_at);

-- Function to log errors
CREATE OR REPLACE FUNCTION log_error(
  p_user_id uuid,
  p_level text,
  p_component text,
  p_message text,
  p_error_details jsonb DEFAULT '{}'::jsonb,
  p_stack_trace text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO error_logs (
    user_id,
    level,
    component,
    message,
    error_details,
    stack_trace,
    metadata,
    context
  ) VALUES (
    p_user_id,
    p_level,
    p_component,
    p_message,
    p_error_details,
    p_stack_trace,
    p_metadata,
    p_context
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve error logs
CREATE OR REPLACE FUNCTION resolve_error_log(
  p_log_id uuid,
  p_notes text,
  p_resolved_by uuid
) RETURNS void AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE error_logs SET
    is_resolved = true,
    resolved_at = now(),
    resolution_notes = p_notes,
    resolved_by = p_resolved_by
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;