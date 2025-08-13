/*
  # Shared Memory Layer Schema

  1. New Tables
    - `shared_memory_actions`
      - Stores user actions and data shared between apps
      - Includes metadata, timestamps, and access control
    - `shared_memory_settings`
      - Stores user preferences for shared memory layer
      - Controls data sharing, retention, and permissions

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Implement data retention policies

  3. Indexes
    - Optimize queries for timestamp-based searches
    - Improve category and app filtering performance
*/

-- Shared Memory Actions table
CREATE TABLE shared_memory_actions (
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

-- Enable RLS
ALTER TABLE shared_memory_actions ENABLE ROW LEVEL SECURITY;

-- Policies for shared_memory_actions
CREATE POLICY "Users can read own actions"
  ON shared_memory_actions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    NOT is_deleted AND
    (retention_expires_at IS NULL OR retention_expires_at > now())
  );

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

-- Indexes for shared_memory_actions
CREATE INDEX shared_memory_actions_user_timestamp_idx 
  ON shared_memory_actions(user_id, timestamp DESC);
CREATE INDEX shared_memory_actions_category_idx 
  ON shared_memory_actions(category);
CREATE INDEX shared_memory_actions_app_idx 
  ON shared_memory_actions(app_id);
CREATE INDEX shared_memory_actions_retention_idx 
  ON shared_memory_actions(retention_expires_at)
  WHERE retention_expires_at IS NOT NULL;

-- Function to clean up expired actions
CREATE OR REPLACE FUNCTION cleanup_expired_shared_memory_actions()
RETURNS void AS $$
BEGIN
  UPDATE shared_memory_actions
  SET is_deleted = true
  WHERE retention_expires_at < now() AND NOT is_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set retention period on insert
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

-- Trigger for setting retention period
CREATE TRIGGER set_shared_memory_retention_trigger
  BEFORE INSERT ON shared_memory_actions
  FOR EACH ROW
  EXECUTE FUNCTION set_shared_memory_retention();

-- Add shared memory settings to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS shared_memory_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_memory_last_sync timestamptz;

-- Function to initialize shared memory settings
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

-- Trigger for initializing shared memory settings
CREATE TRIGGER initialize_shared_memory_settings_trigger
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_shared_memory_settings();

-- Update existing user profiles with shared memory settings
DO $$
BEGIN
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
END $$;