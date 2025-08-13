/*
  # Add Missing Columns to app_submissions
  
  1. Changes
    - Add version column
    - Add processing_status column
    - Add build_config column
    - Add validation_results column
    - Add error_logs column
    - Add processing_metadata column
*/

-- Add missing columns to app_submissions
DO $$ BEGIN
  -- Add version column
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS version text DEFAULT '1.0.0';

  -- Add processing_status column
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS processing_status text 
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

  -- Add build_config column
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS build_config jsonb DEFAULT '{
    "node_version": "20",
    "build_command": "npm run build",
    "output_dir": "dist"
  }'::jsonb;

  -- Add validation_results column
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS validation_results jsonb DEFAULT '{}'::jsonb;

  -- Add error_logs column
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS error_logs jsonb DEFAULT '[]'::jsonb;

  -- Add processing_metadata column
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS processing_metadata jsonb DEFAULT '{}'::jsonb;

EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create indexes for better performance
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_app_submissions_version ON app_submissions(version);
  CREATE INDEX IF NOT EXISTS idx_app_submissions_processing_status ON app_submissions(processing_status);
  CREATE INDEX IF NOT EXISTS idx_app_submissions_build_config ON app_submissions USING gin(build_config);
  CREATE INDEX IF NOT EXISTS idx_app_submissions_validation_results ON app_submissions USING gin(validation_results);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Update existing rows with default values
UPDATE app_submissions 
SET 
  version = '1.0.0',
  processing_status = 'pending',
  build_config = '{
    "node_version": "20",
    "build_command": "npm run build",
    "output_dir": "dist"
  }'::jsonb,
  validation_results = '{}'::jsonb,
  error_logs = '[]'::jsonb,
  processing_metadata = '{}'::jsonb
WHERE version IS NULL;