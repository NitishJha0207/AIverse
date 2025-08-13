-- Check if policies exist before dropping them
DO $$ BEGIN
  -- Drop organization policies that may cause recursion
  DROP POLICY IF EXISTS "Organization admins can manage their organization" ON organizations;
  DROP POLICY IF EXISTS "Organization users can view their organization" ON organizations;
  DROP POLICY IF EXISTS "Organization admins can manage organization" ON organizations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new simplified policies with different names to avoid conflicts
CREATE POLICY "Organization admin can manage org" ON organizations
  FOR ALL 
  TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Organization members can view org" ON organizations
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

-- Fix organization_users policies to avoid recursion
DROP POLICY IF EXISTS "Organization admins can manage users" ON organization_users;
DROP POLICY IF EXISTS "Users can view their organization membership" ON organization_users;

CREATE POLICY "Organization admins can manage users" ON organization_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_users.organization_id
      AND o.admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_users.organization_id
      AND o.admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their organization membership" ON organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix license reference in organizations table
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_license_id_fkey;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_license_id_fkey
  FOREIGN KEY (license_id)
  REFERENCES licenses(id);

-- Fix admin policies to avoid recursion
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
DROP POLICY IF EXISTS "Admins can manage app listings" ON app_listings;

CREATE POLICY "Admins can view admin users" ON admin_users
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage app versions" ON app_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Admins can view all error logs" ON error_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "Admins can manage app listings" ON app_listings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid()
      LIMIT 1
    )
  );