/*
  # Fix RLS policies and table relationships

  1. Changes
    - Fix infinite recursion in organizations RLS policies
    - Update app_installations foreign key to reference app_listings instead of apps
    
  2. Security
    - Simplify organization RLS policies to prevent recursion
    - Maintain proper access control without recursive checks
*/

-- Drop existing organization policies that may cause recursion
DROP POLICY IF EXISTS "Organization admins can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Organization users can view their organization" ON organizations;

-- Create new simplified policies
CREATE POLICY "Organization admins can manage organization" ON organizations
  FOR ALL 
  TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Organization users can view organization" ON organizations
  FOR SELECT
  TO authenticated
  USING (
    admin_user_id = auth.uid() OR 
    id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Update app_installations foreign key
ALTER TABLE app_installations 
  DROP CONSTRAINT IF EXISTS app_installations_app_id_fkey;

ALTER TABLE app_installations
  ADD CONSTRAINT app_installations_app_id_fkey 
  FOREIGN KEY (app_id) 
  REFERENCES app_listings(id) 
  ON DELETE CASCADE;