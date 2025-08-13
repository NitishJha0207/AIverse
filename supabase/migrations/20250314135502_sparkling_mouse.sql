/*
  # Fix admin users policy
  
  1. Changes
    - Remove recursive policy
    - Add direct policy for admin users
    - Fix infinite recursion issue
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;

-- Create new non-recursive policy
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check against user_id without recursion
    user_id = auth.uid()
  );

-- Update is_admin function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Direct check without recursion
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;