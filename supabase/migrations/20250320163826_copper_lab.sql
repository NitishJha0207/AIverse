/*
  # Add app version tracking
  
  1. New Tables
    - app_versions: Track application versions and updates
    
  2. Security
    - Enable RLS
    - Add policies for version access
*/

-- Create app_versions table
CREATE TABLE app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  force_update boolean DEFAULT false,
  min_version text,
  changes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read app versions"
  ON app_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

-- Create index for faster version lookups
CREATE INDEX idx_app_versions_created_at ON app_versions(created_at DESC);

-- Insert initial version
INSERT INTO app_versions (version, changes)
VALUES ('1.0.0', '["Initial release"]'::jsonb);