-- Fix organization_users policies to avoid recursion
DROP POLICY IF EXISTS "Organization admins can manage users" ON organization_users;
DROP POLICY IF EXISTS "Users can view their organization membership" ON organization_users;
DROP POLICY IF EXISTS "Organization users can view organization" ON organization_users;

-- Create new non-recursive policies
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

-- Fix app_containers foreign key
ALTER TABLE app_containers
  DROP CONSTRAINT IF EXISTS app_containers_app_id_fkey;

ALTER TABLE app_containers
  ADD CONSTRAINT app_containers_app_id_fkey
  FOREIGN KEY (app_id)
  REFERENCES app_listings(id)
  ON DELETE CASCADE;

-- Fix shared_memory_logs foreign key
ALTER TABLE shared_memory_logs
  DROP CONSTRAINT IF EXISTS shared_memory_logs_app_id_fkey;

ALTER TABLE shared_memory_logs
  ADD CONSTRAINT shared_memory_logs_app_id_fkey
  FOREIGN KEY (app_id)
  REFERENCES app_listings(id);

-- Fix shared_memory_access foreign key
ALTER TABLE shared_memory_access
  DROP CONSTRAINT IF EXISTS shared_memory_access_app_id_fkey;

ALTER TABLE shared_memory_access
  ADD CONSTRAINT shared_memory_access_app_id_fkey
  FOREIGN KEY (app_id)
  REFERENCES app_listings(id)
  ON DELETE CASCADE;

-- Fix app_permissions foreign key
ALTER TABLE app_permissions
  DROP CONSTRAINT IF EXISTS app_permissions_app_id_fkey;

ALTER TABLE app_permissions
  ADD CONSTRAINT app_permissions_app_id_fkey
  FOREIGN KEY (app_id)
  REFERENCES app_listings(id)
  ON DELETE CASCADE;

-- Fix app_sandboxes foreign key
ALTER TABLE app_sandboxes
  DROP CONSTRAINT IF EXISTS app_sandboxes_app_id_fkey;

ALTER TABLE app_sandboxes
  ADD CONSTRAINT app_sandboxes_app_id_fkey
  FOREIGN KEY (app_id)
  REFERENCES app_listings(id)
  ON DELETE CASCADE;

-- Update get_user_organization function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- First check if user is an admin of any organization
  SELECT id INTO v_org_id
  FROM organizations
  WHERE admin_user_id = p_user_id
  LIMIT 1;
  
  -- If not an admin, check organization_users table
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM organization_users
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_admin function to be more efficient
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = user_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has enterprise access
CREATE OR REPLACE FUNCTION has_enterprise_access(
  p_user_id uuid,
  p_required_tier text DEFAULT 'enterprise_standard'
) RETURNS boolean AS $$
DECLARE
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM organization_users ou
    JOIN organizations o ON ou.organization_id = o.id
    JOIN licenses l ON o.license_id = l.id
    WHERE ou.user_id = p_user_id
    AND l.tier = p_required_tier
    AND l.is_active = true
    AND l.expires_at > now()
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;