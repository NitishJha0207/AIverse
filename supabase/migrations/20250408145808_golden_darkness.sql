-- Fix organization domain verification by ensuring proper indexes and constraints

-- Add index for domain lookups
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);

-- Ensure domain is unique
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_domain_key'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_domain_key UNIQUE (domain);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create a function to get organization by domain
CREATE OR REPLACE FUNCTION get_organization_by_domain(p_domain text)
RETURNS SETOF organizations AS $$
BEGIN
  RETURN QUERY
  SELECT o.*
  FROM organizations o
  WHERE o.domain = p_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the license-organization relationship
DO $$ 
BEGIN
  -- Update the license references in organizations
  UPDATE organizations o
  SET license_id = l.id
  FROM licenses l
  WHERE l.organization_id = o.id
  AND o.license_id IS NULL;
END $$;

-- Create a function to get organization with license
CREATE OR REPLACE FUNCTION get_organization_with_license(p_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  domain text,
  logo_url text,
  admin_user_id uuid,
  sso_enabled boolean,
  sso_provider text,
  sso_config jsonb,
  custom_branding jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  license_id uuid,
  license_tier text,
  license_max_users integer,
  license_current_users integer,
  license_features jsonb,
  license_expires_at timestamptz,
  license_is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.domain,
    o.logo_url,
    o.admin_user_id,
    o.sso_enabled,
    o.sso_provider,
    o.sso_config,
    o.custom_branding,
    o.created_at,
    o.updated_at,
    o.license_id,
    l.tier,
    l.max_users,
    l.current_users,
    l.features,
    l.expires_at,
    l.is_active
  FROM organizations o
  LEFT JOIN licenses l ON o.license_id = l.id
  WHERE o.id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create organization with license in a single transaction
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
    v_max_users := 2;
  ELSIF p_tier = 'enterprise_premium' THEN
    v_max_users := 5;
  ELSE
    v_max_users := 10;
  END IF;
  
  -- Create features array based on tier
  IF p_tier = 'basic' THEN
    v_features := '["standard_app_installation", "basic_security", "individual_user_controls", "advanced_analytics", "priority_support", "custom_integrations"]'::jsonb;
  ELSIF p_tier = 'enterprise_standard' THEN
    v_features := '["standard_app_installation", "basic_security", "individual_user_controls", "team_management", "sso_integration", "advanced_security"]'::jsonb;
  ELSE
    v_features := '["standard_app_installation", "basic_security", "individual_user_controls", "team_management", "sso_integration", "advanced_security", "usage_analytics", "sla_support", "custom_app_deployment"]'::jsonb;
  END IF;
  
  -- Create license
  INSERT INTO licenses (
    organization_id,
    tier,
    max_users,
    current_users,
    features,
    expires_at,
    is_active
  ) VALUES (
    v_org_id,
    p_tier,
    v_max_users,
    1,
    v_features,
    v_expiry_date,
    true
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