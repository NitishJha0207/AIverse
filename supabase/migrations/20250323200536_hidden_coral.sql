/*
  # Fix Security Tables and Policies
  
  1. Changes
    - Safely create tables if they don't exist
    - Drop existing policies before recreating
    - Add proper constraints and indexes
*/

-- Drop existing policies safely
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their app permissions" ON app_permissions;
  DROP POLICY IF EXISTS "Users can manage their memory access settings" ON shared_memory_access;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create app_permissions table
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

-- Enable RLS
ALTER TABLE app_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their app permissions"
  ON app_permissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create shared_memory_access table
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

-- Enable RLS
ALTER TABLE shared_memory_access ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their memory access settings"
  ON shared_memory_access
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_permissions_user_app ON app_permissions(user_id, app_id);
CREATE INDEX IF NOT EXISTS idx_shared_memory_access_user_app ON shared_memory_access(user_id, app_id);