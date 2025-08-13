-- Drop existing policies to prevent recursion
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
  DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
  DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
  DROP POLICY IF EXISTS "Admins can manage app listings" ON app_listings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new non-recursive policies using subqueries
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app listings"
  ON app_listings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

-- Fix app_installations foreign key
ALTER TABLE app_installations
DROP CONSTRAINT IF EXISTS app_installations_app_id_fkey;

ALTER TABLE app_installations
ADD CONSTRAINT app_installations_app_id_fkey
FOREIGN KEY (app_id) REFERENCES app_listings(id)
ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Update is_admin function to be more efficient
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = $1
    AND a.user_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;