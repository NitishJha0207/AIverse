/*
  # Fix Admin Users Policy and Dependencies
  
  1. Changes
    - Drop dependent policies first
    - Update admin check function
    - Create new non-recursive policies
*/

-- First drop the dependent policy
DROP POLICY IF EXISTS "Admins can manage app listings" ON app_listings;

-- Now we can safely drop the admin policies and function
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Create new non-recursive policy
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update is_admin function to be more efficient
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the app listings policy
CREATE POLICY "Admins can manage app listings"
  ON app_listings
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));