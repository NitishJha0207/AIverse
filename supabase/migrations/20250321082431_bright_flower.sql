/*
  # Fix Database Errors
  
  1. Changes
    - Fix infinite recursion in admin policies
    - Fix app_installations foreign key reference
    - Add missing fields to shared_memory_logs
*/

-- Drop existing policies safely
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
  DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
  DROP POLICY IF EXISTS "Users can view own installations" ON app_installations;
  DROP POLICY IF EXISTS "Users can insert own installations" ON app_installations;
  DROP POLICY IF EXISTS "Users can update own installations" ON app_installations;
  DROP POLICY IF EXISTS "Users can delete own installations" ON app_installations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new non-recursive policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view admin users'
    AND tablename = 'admin_users'
  ) THEN
    CREATE POLICY "Admins can view admin users"
      ON admin_users
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can manage app versions'
    AND tablename = 'app_versions'
  ) THEN
    CREATE POLICY "Admins can manage app versions"
      ON app_versions
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users
          WHERE user_id = auth.uid()
          LIMIT 1
        )
      );
  END IF;
END $$;

-- Fix app_installations foreign key
DO $$ BEGIN
  ALTER TABLE app_installations
  DROP CONSTRAINT IF EXISTS app_installations_app_id_fkey;

  ALTER TABLE app_installations
  ADD CONSTRAINT app_installations_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES app_listings(id) ON DELETE CASCADE;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create app installation policies safely
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own installations'
    AND tablename = 'app_installations'
  ) THEN
    CREATE POLICY "Users can view own installations"
      ON app_installations
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can insert own installations'
    AND tablename = 'app_installations'
  ) THEN
    CREATE POLICY "Users can insert own installations"
      ON app_installations
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own installations'
    AND tablename = 'app_installations'
  ) THEN
    CREATE POLICY "Users can update own installations"
      ON app_installations
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own installations'
    AND tablename = 'app_installations'
  ) THEN
    CREATE POLICY "Users can delete own installations"
      ON app_installations
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Fix shared_memory_logs table
DO $$ BEGIN
  -- Add columns if they don't exist
  ALTER TABLE shared_memory_logs
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

  -- Set NOT NULL constraint
  ALTER TABLE shared_memory_logs
  ALTER COLUMN action SET NOT NULL;

  -- Set default for details
  ALTER TABLE shared_memory_logs
  ALTER COLUMN details SET DEFAULT '{}'::jsonb;

  -- Add category constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shared_memory_logs_category_check'
  ) THEN
    ALTER TABLE shared_memory_logs
    ADD CONSTRAINT shared_memory_logs_category_check
    CHECK (category IN ('security', 'performance', 'usage', 'permissions'));
  END IF;

  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_shared_memory_logs_category_timestamp'
  ) THEN
    CREATE INDEX idx_shared_memory_logs_category_timestamp 
    ON shared_memory_logs(category, timestamp DESC);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update logging function
CREATE OR REPLACE FUNCTION log_shared_memory_action(
  p_user_id uuid,
  p_app_id uuid,
  p_category text,
  p_action text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Validate category
  IF p_category NOT IN ('security', 'performance', 'usage', 'permissions') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;

  INSERT INTO shared_memory_logs (
    user_id,
    app_id,
    category,
    action,
    details,
    metadata,
    timestamp
  ) VALUES (
    p_user_id,
    p_app_id,
    p_category,
    p_action,
    p_details,
    p_metadata,
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;