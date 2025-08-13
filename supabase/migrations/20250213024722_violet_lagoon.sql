/*
  # Initial Schema Setup for AI App Store

  1. New Tables
    - `users`
      - Core user information and preferences
    - `apps`
      - App metadata, binaries, and verification status
    - `app_installations`
      - Tracks app installations and user permissions
    - `app_metrics`
      - Usage metrics and analytics
    - `user_data_permissions`
      - User data sharing preferences and consent
    - `shared_memory_logs`
      - Tracks shared memory usage across apps

  2. Security
    - Enable RLS on all tables
    - Add policies for data access control
    - Implement user-specific data isolation
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  name text,
  is_developer boolean DEFAULT false,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES users(id),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  icon_url text,
  binary_url text,
  binary_type text,
  version text DEFAULT '1.0.0',
  status text DEFAULT 'pending',
  verification_details jsonb DEFAULT '{}'::jsonb,
  api_features jsonb DEFAULT '[]'::jsonb,
  required_permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published apps"
  ON apps
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Developers can manage own apps"
  ON apps
  FOR ALL
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

-- App installations table
CREATE TABLE IF NOT EXISTS app_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES apps(id),
  user_id uuid REFERENCES users(id),
  granted_permissions jsonb DEFAULT '[]'::jsonb,
  installation_date timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  UNIQUE(app_id, user_id)
);

ALTER TABLE app_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installations"
  ON app_installations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Developers can view their app installations"
  ON app_installations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM apps
    WHERE apps.id = app_installations.app_id
    AND apps.developer_id = auth.uid()
  ));

-- App metrics table
CREATE TABLE IF NOT EXISTS app_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid REFERENCES apps(id),
  metric_type text NOT NULL,
  value jsonb NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE app_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can view their app metrics"
  ON app_metrics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM apps
    WHERE apps.id = app_metrics.app_id
    AND apps.developer_id = auth.uid()
  ));

-- User data permissions table
CREATE TABLE IF NOT EXISTS user_data_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  app_id uuid REFERENCES apps(id),
  permission_type text NOT NULL,
  is_granted boolean DEFAULT false,
  data_collection_policy jsonb,
  granted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, app_id, permission_type)
);

ALTER TABLE user_data_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their data permissions"
  ON user_data_permissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Shared memory logs table
CREATE TABLE IF NOT EXISTS shared_memory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  app_id uuid REFERENCES apps(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE shared_memory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their memory logs"
  ON shared_memory_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();