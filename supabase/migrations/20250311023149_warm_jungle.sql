/*
  # Add app processing infrastructure
  
  1. New Tables
    - `app_processing_jobs`: Tracks background processing of app submissions
    - `app_binary_versions`: Stores different versions of processed app binaries
    - `app_assets`: Stores processed assets like icons, screenshots
    
  2. Security
    - Enable RLS on all new tables
    - Add policies for developers to manage their apps
    - Add policies for users to view processed assets
    
  3. Changes
    - Add foreign key relationships
    - Add status tracking
    - Add validation constraints
*/

-- Drop existing objects if they exist
DO $$ 
BEGIN
    -- Drop triggers
    DROP TRIGGER IF EXISTS update_app_processing_jobs_updated_at ON app_processing_jobs;
    DROP TRIGGER IF EXISTS update_app_binary_versions_updated_at ON app_binary_versions;
    DROP TRIGGER IF EXISTS update_app_assets_updated_at ON app_assets;
    DROP TRIGGER IF EXISTS start_app_processing ON app_submissions;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS initiate_app_processing();
    
    -- Drop tables (in correct order due to dependencies)
    DROP TABLE IF EXISTS app_binary_versions;
    DROP TABLE IF EXISTS app_assets;
    DROP TABLE IF EXISTS app_processing_jobs;
END $$;

-- App Processing Jobs table
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Developers can view their app processing jobs" ON app_processing_jobs;

-- Create new policies
CREATE POLICY "Developers can view their app processing jobs"
  ON app_processing_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_submissions
      WHERE app_submissions.id = app_processing_jobs.app_submission_id
      AND app_submissions.developer_id IN (
        SELECT id FROM developer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- App Binary Versions table
CREATE TABLE app_binary_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_submission_id uuid NOT NULL REFERENCES app_submissions(id) ON DELETE CASCADE,
  processing_job_id uuid NOT NULL REFERENCES app_processing_jobs(id) ON DELETE CASCADE,
  version text NOT NULL,
  binary_type text NOT NULL,
  file_size bigint NOT NULL,
  checksum text NOT NULL,
  storage_path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  validation_results jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_binary_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Developers can view their app binary versions" ON app_binary_versions;

-- Create new policies
CREATE POLICY "Developers can view their app binary versions"
  ON app_binary_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_submissions
      WHERE app_submissions.id = app_binary_versions.app_submission_id
      AND app_submissions.developer_id IN (
        SELECT id FROM developer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- App Assets table
CREATE TABLE app_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_submission_id uuid NOT NULL REFERENCES app_submissions(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('icon', 'screenshot', 'preview')),
  original_url text NOT NULL,
  processed_url text,
  processing_metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view processed app assets" ON app_assets;
DROP POLICY IF EXISTS "Developers can manage their app assets" ON app_assets;

-- Create new policies
CREATE POLICY "Anyone can view processed app assets"
  ON app_assets
  FOR SELECT
  TO authenticated
  USING (status = 'completed');

CREATE POLICY "Developers can manage their app assets"
  ON app_assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_submissions
      WHERE app_submissions.id = app_assets.app_submission_id
      AND app_submissions.developer_id IN (
        SELECT id FROM developer_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Add trigger to update timestamps
CREATE TRIGGER update_app_processing_jobs_updated_at
  BEFORE UPDATE ON app_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_binary_versions_updated_at
  BEFORE UPDATE ON app_binary_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_assets_updated_at
  BEFORE UPDATE ON app_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_app_processing_jobs_submission_id ON app_processing_jobs(app_submission_id);
CREATE INDEX idx_app_processing_jobs_status ON app_processing_jobs(status);
CREATE INDEX idx_app_binary_versions_submission_id ON app_binary_versions(app_submission_id);
CREATE INDEX idx_app_binary_versions_active ON app_binary_versions(is_active) WHERE is_active = true;
CREATE INDEX idx_app_assets_submission_id ON app_assets(app_submission_id);
CREATE INDEX idx_app_assets_status ON app_assets(status);

-- Add function to initiate app processing
CREATE OR REPLACE FUNCTION initiate_app_processing()
RETURNS trigger AS $$
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to start processing on submission
CREATE TRIGGER start_app_processing
  AFTER INSERT ON app_submissions
  FOR EACH ROW
  EXECUTE FUNCTION initiate_app_processing();