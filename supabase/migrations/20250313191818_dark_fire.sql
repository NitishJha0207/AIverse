/*
  # Security Framework Schema - Part 1: App Permissions
  
  1. Changes
    - Safe creation of app_permissions table
    - Enable RLS and add policies
    - Add performance indexes
*/

-- Safe creation of app_permissions table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS app_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id uuid REFERENCES app_listings(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_type text NOT NULL,
    is_granted boolean DEFAULT false,
    granted_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(app_id, user_id, permission_type)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE IF EXISTS app_permissions ENABLE ROW LEVEL SECURITY;

-- Safe policy creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their app permissions" ON app_permissions;
  CREATE POLICY "Users can manage their app permissions"
    ON app_permissions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Safe index creation
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_app_permissions_user_app ON app_permissions(user_id, app_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;