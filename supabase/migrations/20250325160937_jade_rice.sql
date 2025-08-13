/*
  # Fix Admin Policies
  
  1. Changes
    - Fix ambiguous user_id references
    - Update admin policies with explicit table references
    - Add proper table aliases
*/

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
  DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
  DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
  DROP POLICY IF EXISTS "Admins can manage app listings" ON app_listings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies with explicit table references
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    LIMIT 1
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    LIMIT 1
  ));

CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app listings"
  ON app_listings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    LIMIT 1
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    LIMIT 1
  ));

-- Update is_admin function to use explicit reference
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = $1
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;