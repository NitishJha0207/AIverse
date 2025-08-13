/*
  # Security Framework Schema - Part 3: App Sandboxes
  
  1. Changes
    - Safe creation of app_sandboxes table
    - Enable RLS and add policies
    - Add performance indexes
*/

-- Safe creation of app_sandboxes table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS app_sandboxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid REFERENCES app_listings(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    isolation_level text NOT NULL DEFAULT 'strict',
    resource_limits jsonb DEFAULT '{
      "memory_mb": 256,
      "storage_mb": 100,
      "cpu_percent": 50
    }',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(app_id, user_id)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE IF EXISTS app_sandboxes ENABLE ROW LEVEL SECURITY;

-- Safe policy creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their app sandboxes" ON app_sandboxes;
  CREATE POLICY "Users can view their app sandboxes"
    ON app_sandboxes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Safe index creation
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_app_sandboxes_user_app ON app_sandboxes(user_id, app_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;