/*
  # Security Framework Schema - Part 2: Shared Memory Access
  
  1. Changes
    - Safe creation of shared_memory_access table
    - Enable RLS and add policies
    - Add performance indexes
*/

-- Safe creation of shared_memory_access table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS shared_memory_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid REFERENCES app_listings(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    access_type text NOT NULL CHECK (access_type IN ('read', 'write', 'read_write')),
    data_scope jsonb NOT NULL DEFAULT '[]',
    granted_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    UNIQUE(app_id, user_id)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE IF EXISTS shared_memory_access ENABLE ROW LEVEL SECURITY;

-- Safe policy creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their memory access settings" ON shared_memory_access;
  CREATE POLICY "Users can manage their memory access settings"
    ON shared_memory_access
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Safe index creation
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_shared_memory_access_user_app ON shared_memory_access(user_id, app_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;