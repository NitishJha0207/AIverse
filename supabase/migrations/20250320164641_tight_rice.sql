/*
  # Fix app versions table
  
  1. Changes
    - Safe table creation with IF NOT EXISTS
    - Add missing columns if needed
    - Update policies and indexes
*/

-- Safely create or update app_versions table
DO $$ BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS app_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version text NOT NULL,
    force_update boolean DEFAULT false,
    min_version text,
    changes jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
  );

  -- Add any missing columns
  BEGIN
    ALTER TABLE app_versions 
      ADD COLUMN IF NOT EXISTS force_update boolean DEFAULT false;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE app_versions 
      ADD COLUMN IF NOT EXISTS min_version text;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE app_versions 
      ADD COLUMN IF NOT EXISTS changes jsonb DEFAULT '[]'::jsonb;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE app_versions 
      ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Safely create policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read app versions" ON app_versions;
  CREATE POLICY "Anyone can read app versions"
    ON app_versions
    FOR SELECT
    USING (true);

  DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
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
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Safely create index
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_app_versions_created_at 
    ON app_versions(created_at DESC);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Insert initial version if no versions exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_versions) THEN
    INSERT INTO app_versions (version, changes)
    VALUES ('1.0.0', '["Initial release"]'::jsonb);
  END IF;
END $$;