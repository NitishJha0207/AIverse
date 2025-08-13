/*
  # Security Framework Schema Fix
  
  1. Changes
    - Safe creation of tables with IF NOT EXISTS
    - Safe policy creation with DO blocks
    - Preserve existing data
    
  2. Security
    - Enable RLS
    - Add policies for secure access control
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
ALTER TABLE app_permissions ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE shared_memory_access ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE app_sandboxes ENABLE ROW LEVEL SECURITY;

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

-- Safe function creation/update
CREATE OR REPLACE FUNCTION check_app_permission(
  p_user_id uuid,
  p_app_id uuid,
  p_permission_type text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_permissions
    WHERE user_id = p_user_id
    AND app_id = p_app_id
    AND permission_type = p_permission_type
    AND is_granted = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_memory_access(
  p_user_id uuid,
  p_app_id uuid,
  p_access_type text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_memory_access
    WHERE user_id = p_user_id
    AND app_id = p_app_id
    AND (
      access_type = p_access_type
      OR access_type = 'read_write'
    )
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe index creation
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_app_permissions_user_app ON app_permissions(user_id, app_id);
  CREATE INDEX IF NOT EXISTS idx_shared_memory_access_user_app ON shared_memory_access(user_id, app_id);
  CREATE INDEX IF NOT EXISTS idx_app_sandboxes_user_app ON app_sandboxes(user_id, app_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;