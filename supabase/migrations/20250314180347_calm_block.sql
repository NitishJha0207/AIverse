/*
  # Fix App Processing RLS Policies
  
  1. Changes
    - Add RLS policies for app processing jobs
    - Allow developers to create and update processing jobs
    - Fix permission issues with app submission processing
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Developers can view their app processing jobs" ON app_processing_jobs;

-- Create comprehensive policies for app processing jobs
CREATE POLICY "Developers can manage their app processing jobs"
  ON app_processing_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_submissions
      WHERE app_submissions.id = app_processing_jobs.app_submission_id
      AND app_submissions.developer_id IN (
        SELECT id FROM developer_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_submissions
      WHERE app_submissions.id = app_processing_jobs.app_submission_id
      AND app_submissions.developer_id IN (
        SELECT id FROM developer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Update app processing trigger to handle permissions
CREATE OR REPLACE FUNCTION initiate_app_processing()
RETURNS TRIGGER AS $$
DECLARE
  v_developer_id uuid;
BEGIN
  -- Get developer ID from submission
  SELECT developer_id INTO v_developer_id
  FROM app_submissions
  WHERE id = NEW.id;

  -- Verify developer exists and has permission
  IF NOT EXISTS (
    SELECT 1 FROM developer_profiles
    WHERE id = v_developer_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create processing job
  INSERT INTO app_processing_jobs (
    app_submission_id,
    status,
    processing_steps
  ) VALUES (
    NEW.id,
    'pending',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'validate_binary',
        'status', 'pending'
      ),
      jsonb_build_object(
        'name', 'process_assets',
        'status', 'pending'
      ),
      jsonb_build_object(
        'name', 'generate_installable',
        'status', 'pending'
      )
    )
  );
  
  -- Update submission status
  UPDATE app_submissions
  SET status = 'pending'
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS start_app_processing ON app_submissions;
CREATE TRIGGER start_app_processing
  AFTER INSERT ON app_submissions
  FOR EACH ROW
  EXECUTE FUNCTION initiate_app_processing();

-- Add helper function to check processing permissions
CREATE OR REPLACE FUNCTION can_process_app(submission_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_submissions s
    JOIN developer_profiles d ON s.developer_id = d.id
    WHERE s.id = submission_id
    AND d.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;