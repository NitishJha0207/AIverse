/*
  # Fix App Processing and Installation System

  1. Changes
    - Drop existing policies first
    - Recreate tables and policies in correct order
    - Fix foreign key references
*/

-- First drop existing policies and triggers
DROP POLICY IF EXISTS "Developers can view their app processing jobs" ON app_processing_jobs;
DROP TRIGGER IF EXISTS start_app_processing ON app_submissions;
DROP TRIGGER IF EXISTS sync_app_listing_on_approval ON app_submissions;

-- Drop and recreate app_processing_jobs table
DROP TABLE IF EXISTS app_processing_jobs CASCADE;

CREATE TABLE app_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_submission_id uuid NOT NULL REFERENCES app_submissions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  processing_steps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create new policy
CREATE POLICY "Developers can view their app processing jobs"
  ON app_processing_jobs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM app_submissions
    WHERE app_submissions.id = app_processing_jobs.app_submission_id
    AND app_submissions.developer_id IN (
      SELECT id FROM developer_profiles WHERE user_id = auth.uid()
    )
  ));

-- Update app_installations table
ALTER TABLE app_installations 
DROP CONSTRAINT IF EXISTS app_installations_app_id_fkey;

ALTER TABLE app_installations
ADD CONSTRAINT app_installations_app_id_fkey 
FOREIGN KEY (app_id) 
REFERENCES app_listings(id) 
ON DELETE CASCADE;

-- Create or replace the app processing trigger function
CREATE OR REPLACE FUNCTION initiate_app_processing()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

-- Create or replace the app listing sync function
CREATE OR REPLACE FUNCTION sync_app_listing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO app_listings (
      id,
      name,
      description,
      short_description,
      developer_name,
      price,
      category,
      tags,
      icon_url,
      screenshots,
      features,
      is_available,
      is_native,
      version,
      binary_url
    )
    VALUES (
      NEW.id,
      NEW.name,
      NEW.description,
      NEW.short_description,
      (SELECT company_name FROM developer_profiles WHERE id = NEW.developer_id),
      NEW.price,
      NEW.category,
      NEW.tags,
      NEW.icon_url,
      NEW.screenshots,
      NEW.features,
      true,
      true,
      '1.0.0',
      NEW.binary_url
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      short_description = EXCLUDED.short_description,
      developer_name = EXCLUDED.developer_name,
      price = EXCLUDED.price,
      category = EXCLUDED.category,
      tags = EXCLUDED.tags,
      icon_url = EXCLUDED.icon_url,
      screenshots = EXCLUDED.screenshots,
      features = EXCLUDED.features,
      is_available = true,
      is_native = true,
      version = EXCLUDED.version,
      binary_url = EXCLUDED.binary_url,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new triggers
CREATE TRIGGER start_app_processing
  AFTER INSERT ON app_submissions
  FOR EACH ROW
  EXECUTE FUNCTION initiate_app_processing();

CREATE TRIGGER sync_app_listing_on_approval
  AFTER UPDATE ON app_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION sync_app_listing();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_processing_jobs_submission_id 
  ON app_processing_jobs(app_submission_id);
CREATE INDEX IF NOT EXISTS idx_app_processing_jobs_status 
  ON app_processing_jobs(status);

-- Update existing app submissions to pending if stuck
UPDATE app_submissions 
SET status = 'pending'
WHERE status = 'draft' 
AND created_at < now() - interval '1 hour';