-- This migration consolidates and fixes previous migration issues
-- by creating a new migration with a unique timestamp

-- Create a function to safely create an organization with license
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
  -- Create organization first
  INSERT INTO organizations (
    name,
    domain,
    admin_user_id
  ) VALUES (
    p_name,
    p_domain,
    p_admin_user_id
  ) RETURNING id INTO v_org_id;
  
  -- Set license details
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
  
  -- Create license
  INSERT INTO licenses (
    organization_id,
    tier,
    max_users,
    features,
    expires_at
  ) VALUES (
    v_org_id,
    p_tier,
    v_max_users,
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
  
  RETURN v_org_id;
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

-- Create a function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(
  p_user_id uuid
) RETURNS uuid AS $$
DECLARE
  v_organization_id uuid;
BEGIN
  SELECT organization_id INTO v_organization_id
  FROM organization_users
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create helper functions for organization access checks
CREATE OR REPLACE FUNCTION is_user_in_organization(p_user_id uuid, p_organization_id uuid) 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organizations o
    WHERE o.id = p_organization_id
    AND o.admin_user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 
    FROM organization_users ou
    WHERE ou.organization_id = p_organization_id
    AND ou.user_id = p_user_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_organization_admin(p_user_id uuid, p_organization_id uuid) 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organizations o
    WHERE o.id = p_organization_id
    AND o.admin_user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 
    FROM organization_users ou
    WHERE ou.organization_id = p_organization_id
    AND ou.user_id = p_user_id
    AND ou.role = 'admin'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user's organization role
CREATE OR REPLACE FUNCTION get_user_organization_role(p_user_id uuid, p_organization_id uuid) 
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- Check if user is the organization admin
  IF EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_organization_id
    AND admin_user_id = p_user_id
  ) THEN
    RETURN 'admin';
  END IF;
  
  -- Get role from organization_users
  SELECT role INTO v_role
  FROM organization_users
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;