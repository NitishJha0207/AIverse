-- This migration fixes organization creation issues by adding a more robust
-- create_organization_with_license function and fixing circular dependencies

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_organization_with_license(text, text, uuid, text);

-- Create a more robust function to create organization with license
CREATE OR REPLACE FUNCTION create_organization_with_license(
  p_name text,
  p_domain text,
  p_admin_user_id uuid,
  p_tier text
) RETURNS uuid AS $$
DECLARE
  v_org_id uuid;
  v_license_id uuid;
  v_expiry_date timestamptz;
  v_max_users integer;
  v_features jsonb;
BEGIN
  -- Set license details based on tier
  v_expiry_date := now() + interval '1 year';
  
  IF p_tier = 'enterprise_standard' THEN
    v_max_users := 50;
  ELSIF p_tier = 'enterprise_premium' THEN
    v_max_users := 1000;
  ELSE
    v_max_users := 1;
  END IF;
  
  -- Create features array based on tier
  IF p_tier = 'basic' THEN
    v_features := '["standard_app_installation", "basic_security", "individual_user_controls"]'::jsonb;
  ELSIF p_tier = 'enterprise_standard' THEN
    v_features := '["standard_app_installation", "basic_security", "individual_user_controls", "team_management", "sso_integration", "advanced_security", "usage_analytics", "sla_support", "custom_app_deployment"]'::jsonb;
  ELSE
    v_features := '["standard_app_installation", "basic_security", "individual_user_controls", "team_management", "sso_integration", "advanced_security", "usage_analytics", "sla_support", "custom_app_deployment", "private_app_store", "custom_branding", "advanced_compliance", "dedicated_support", "api_access", "custom_integrations"]'::jsonb;
  END IF;

  -- Create organization
  INSERT INTO organizations (
    name,
    domain,
    admin_user_id
  ) VALUES (
    p_name,
    p_domain,
    p_admin_user_id
  ) RETURNING id INTO v_org_id;
  
  -- Create license
  INSERT INTO licenses (
    organization_id,
    tier,
    max_users,
    current_users,
    features,
    expires_at
  ) VALUES (
    v_org_id,
    p_tier,
    v_max_users,
    1, -- Start with 1 user (the admin)
    v_features,
    v_expiry_date
  ) RETURNING id INTO v_license_id;
  
  -- Update organization with license ID
  UPDATE organizations
  SET license_id = v_license_id
  WHERE id = v_org_id;
  
  -- Add admin user to organization
  INSERT INTO organization_users (
    organization_id,
    user_id,
    role
  ) VALUES (
    v_org_id,
    p_admin_user_id,
    'admin'
  );
  
  -- Create default enterprise settings
  INSERT INTO enterprise_settings (
    organization_id
  ) VALUES (
    v_org_id
  );
  
  -- Return the organization ID
  RETURN v_org_id;
EXCEPTION
  WHEN others THEN
    -- Log error details
    RAISE NOTICE 'Error creating organization: %', SQLERRM;
    -- Re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix circular dependencies in policies
DO $$ 
BEGIN
  -- Drop existing policies that might cause recursion
  DROP POLICY IF EXISTS "Organization admins can manage users" ON organization_users;
  DROP POLICY IF EXISTS "Organization admins can manage their organization" ON organizations;
  
  -- Create new non-recursive policies
  CREATE POLICY "Organization admins can manage users"
    ON organization_users
    FOR ALL
    TO authenticated
    USING (
      -- Direct admin check
      EXISTS (
        SELECT 1 
        FROM organizations o
        WHERE o.id = organization_users.organization_id
        AND o.admin_user_id = auth.uid()
      )
    )
    WITH CHECK (
      -- Direct admin check
      EXISTS (
        SELECT 1 
        FROM organizations o
        WHERE o.id = organization_users.organization_id
        AND o.admin_user_id = auth.uid()
      )
    );

  CREATE POLICY "Organization admins can manage their organization"
    ON organizations
    FOR ALL
    TO authenticated
    USING (
      -- Direct admin check
      admin_user_id = auth.uid()
    )
    WITH CHECK (
      -- Direct admin check
      admin_user_id = auth.uid()
    );
    
EXCEPTION
  WHEN undefined_object THEN
    -- Policy doesn't exist, nothing to do
    NULL;
END $$;

-- Fix the license-organization relationship
DO $$ 
BEGIN
  -- Check if the constraint exists before trying to drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organizations_license_id_fkey'
    AND table_name = 'organizations'
  ) THEN
    ALTER TABLE organizations 
    DROP CONSTRAINT organizations_license_id_fkey;
  END IF;

  -- Add the constraint
  ALTER TABLE organizations
  ADD CONSTRAINT organizations_license_id_fkey
  FOREIGN KEY (license_id)
  REFERENCES licenses(id);
EXCEPTION
  WHEN undefined_object THEN
    -- Constraint doesn't exist, nothing to do
    NULL;
END $$;