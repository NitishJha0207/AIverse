-- Drop existing objects if they exist
DROP TABLE IF EXISTS installation_logs CASCADE;
DROP TABLE IF EXISTS app_installations CASCADE;
DROP FUNCTION IF EXISTS update_app_installation_timestamp() CASCADE;
DROP FUNCTION IF EXISTS log_installation_event() CASCADE;

-- Create app_installations table
CREATE TABLE app_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES app_listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  version text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'downloading', 'installing', 'installed', 'failed', 'uninstalled')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error text,
  installed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(app_id, user_id)
);

-- Enable RLS
ALTER TABLE app_installations ENABLE ROW LEVEL SECURITY;

-- Safely create policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own installations" ON app_installations;
  CREATE POLICY "Users can view own installations"
    ON app_installations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own installations" ON app_installations;
  CREATE POLICY "Users can manage own installations"
    ON app_installations
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_installations_user_id ON app_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_app_id ON app_installations(app_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_status ON app_installations(status);
CREATE INDEX IF NOT EXISTS idx_app_installations_created_at ON app_installations(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_app_installation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
DROP TRIGGER IF EXISTS update_app_installation_timestamp ON app_installations;
CREATE TRIGGER update_app_installation_timestamp
  BEFORE UPDATE ON app_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_app_installation_timestamp();

-- Add columns to app_listings if they don't exist
DO $$ 
BEGIN
  ALTER TABLE app_listings ADD COLUMN IF NOT EXISTS is_native boolean DEFAULT false;
  ALTER TABLE app_listings ADD COLUMN IF NOT EXISTS version text;
  ALTER TABLE app_listings ADD COLUMN IF NOT EXISTS binary_url text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create installation_logs table for detailed tracking
CREATE TABLE installation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES app_installations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE installation_logs ENABLE ROW LEVEL SECURITY;

-- Safely create policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own installation logs" ON installation_logs;
  CREATE POLICY "Users can view own installation logs"
    ON installation_logs
    FOR SELECT
    TO authenticated
    USING (
      installation_id IN (
        SELECT id FROM app_installations WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_installation_logs_installation_id 
  ON installation_logs(installation_id);
CREATE INDEX IF NOT EXISTS idx_installation_logs_created_at 
  ON installation_logs(created_at DESC);

-- Function to log installation events
CREATE OR REPLACE FUNCTION log_installation_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO installation_logs (
      installation_id,
      event_type,
      details
    ) VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'progress', NEW.progress,
        'error', NEW.error
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely create trigger for logging installation events
DROP TRIGGER IF EXISTS log_installation_event ON app_installations;
CREATE TRIGGER log_installation_event
  AFTER UPDATE ON app_installations
  FOR EACH ROW
  EXECUTE FUNCTION log_installation_event();