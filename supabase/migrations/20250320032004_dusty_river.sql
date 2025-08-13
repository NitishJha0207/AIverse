/*
  # Fix App Publishing System
  
  1. Changes
    - Fix RLS policies for app submissions and processing
    - Add proper storage policies for app binaries
    - Update status constraints
    
  2. Security
    - Ensure proper access control
    - Fix permission issues
*/

-- Update app_submissions status constraint
ALTER TABLE app_submissions DROP CONSTRAINT IF EXISTS app_submissions_status_check;
ALTER TABLE app_submissions ADD CONSTRAINT app_submissions_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'failed'));

-- Fix app_processing_jobs RLS
ALTER TABLE app_processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developers can manage their app processing jobs" ON app_processing_jobs;
CREATE POLICY "Developers can manage their app processing jobs"
  ON app_processing_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_submissions s
      JOIN developer_profiles d ON s.developer_id = d.id
      WHERE s.id = app_processing_jobs.app_submission_id
      AND d.user_id = auth.uid()
    )
  );

-- Fix storage policies for app binaries
DROP POLICY IF EXISTS "Developers can upload app binaries" ON storage.objects;
CREATE POLICY "Developers can upload app binaries"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'app-binaries'
    AND EXISTS (
      SELECT 1 FROM app_submissions s
      JOIN developer_profiles d ON s.developer_id = d.id
      WHERE d.user_id = auth.uid()
      AND s.id::text = (storage.foldername(name))[1]
    )
  );

-- Fix app_submissions RLS
DROP POLICY IF EXISTS "Developers can manage own submissions" ON app_submissions;
CREATE POLICY "Developers can manage own submissions"
  ON app_submissions
  FOR ALL
  TO authenticated
  USING (
    developer_id IN (
      SELECT id FROM developer_profiles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    developer_id IN (
      SELECT id FROM developer_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Update app processing trigger
CREATE OR REPLACE FUNCTION initiate_app_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify developer permissions
  IF NOT EXISTS (
    SELECT 1 FROM developer_profiles
    WHERE id = NEW.developer_id
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_processing_jobs_submission_id 
  ON app_processing_jobs(app_submission_id);
CREATE INDEX IF NOT EXISTS idx_app_processing_jobs_status 
  ON app_processing_jobs(status);