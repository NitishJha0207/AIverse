/*
  # Add metadata column to app_submissions
  
  1. Changes
    - Add metadata column to app_submissions table
    - Add build configuration storage
    - Add repository URL storage
*/

-- Add metadata column to app_submissions
DO $$ BEGIN
  ALTER TABLE app_submissions
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for faster metadata queries
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_app_submissions_metadata 
  ON app_submissions USING gin(metadata);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Update existing rows with empty metadata if needed
UPDATE app_submissions 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;