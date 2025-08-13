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