/*
  # Fix Shared Memory Implementation

  1. Changes
    - Add existence checks for all objects
    - Safe table alterations
    - Safe policy creation
    - Safe trigger creation

  2. Features
    - Shared memory actions tracking
    - Automatic retention management
    - User preferences initialization
    - Access control policies
*/

-- Safe creation of shared memory actions table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS shared_memory_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id uuid REFERENCES apps(id),
    category text NOT NULL,
    action text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    timestamp timestamptz DEFAULT now(),
    retention_expires_at timestamptz,
    is_deleted boolean DEFAULT false
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Safe RLS enable
ALTER TABLE IF EXISTS shared_memory_actions ENABLE ROW LEVEL SECURITY;

-- Safe policy creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own actions" ON shared_memory_actions;
  CREATE POLICY "Users can read own actions"
    ON shared_memory_actions
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid() AND
      NOT is_deleted AND
      (retention_expires_at IS NULL OR retention_expires_at > now())
    );
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Apps can insert actions for authorized users" ON shared_memory_actions;
  CREATE POLICY "Apps can insert actions for authorized users"
    ON shared_memory_actions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND (preferences->'shared_memory'->>'enabled')::boolean = true
      )
    );
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Safe index creation
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS shared_memory_actions_user_timestamp_idx 
    ON shared_memory_actions(user_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS shared_memory_actions_category_idx 
    ON shared_memory_actions(category);
  CREATE INDEX IF NOT EXISTS shared_memory_actions_app_idx 
    ON shared_memory_actions(app_id);
  CREATE INDEX IF NOT EXISTS shared_memory_actions_retention_idx 
    ON shared_memory_actions(retention_expires_at)
    WHERE retention_expires_at IS NOT NULL;
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Safe function creation/update
CREATE OR REPLACE FUNCTION cleanup_expired_shared_memory_actions()
RETURNS void AS $$
BEGIN
  UPDATE shared_memory_actions
  SET is_deleted = true
  WHERE retention_expires_at < now() AND NOT is_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_shared_memory_retention()
RETURNS trigger AS $$
DECLARE
  retention_days integer;
BEGIN
  -- Get retention period from user preferences
  SELECT (preferences->'shared_memory'->>'retentionPeriod')::integer
  INTO retention_days
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Set expiration if retention period is specified
  IF retention_days IS NOT NULL THEN
    NEW.retention_expires_at := NEW.timestamp + (retention_days || ' days')::interval;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe trigger creation
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_shared_memory_retention_trigger ON shared_memory_actions;
  CREATE TRIGGER set_shared_memory_retention_trigger
    BEFORE INSERT ON shared_memory_actions
    FOR EACH ROW
    EXECUTE FUNCTION set_shared_memory_retention();
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Safe column additions to user_profiles
DO $$ BEGIN
  ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS shared_memory_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared_memory_last_sync timestamptz;
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

-- Safe function creation/update for settings initialization
CREATE OR REPLACE FUNCTION initialize_shared_memory_settings()
RETURNS trigger AS $$
BEGIN
  -- Only initialize if not already set
  IF NEW.preferences->>'shared_memory' IS NULL THEN
    NEW.preferences = jsonb_set(
      COALESCE(NEW.preferences, '{}'::jsonb),
      '{shared_memory}',
      '{
        "enabled": false,
        "storageQuota": 1024,
        "retentionPeriod": 90,
        "autoSync": true,
        "syncInterval": 60,
        "dataCategories": {
          "actions": true,
          "preferences": true,
          "history": true,
          "userContent": false
        },
        "accessControl": {
          "allowedApps": [],
          "blockedApps": [],
          "dataSharing": "selected",
          "requireConsent": true
        }
      }'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe trigger creation for settings initialization
DO $$ BEGIN
  DROP TRIGGER IF EXISTS initialize_shared_memory_settings_trigger ON user_profiles;
  CREATE TRIGGER initialize_shared_memory_settings_trigger
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_shared_memory_settings();
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Safe update of existing user profiles
DO $$ BEGIN
  UPDATE user_profiles
  SET preferences = jsonb_set(
    COALESCE(preferences, '{}'::jsonb),
    '{shared_memory}',
    '{
      "enabled": false,
      "storageQuota": 1024,
      "retentionPeriod": 90,
      "autoSync": true,
      "syncInterval": 60,
      "dataCategories": {
        "actions": true,
        "preferences": true,
        "history": true,
        "userContent": false
      },
      "accessControl": {
        "allowedApps": [],
        "blockedApps": [],
        "dataSharing": "selected",
        "requireConsent": true
      }
    }'::jsonb
  )
  WHERE preferences->>'shared_memory' IS NULL;
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;