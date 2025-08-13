-- Fix organization queries by updating the foreign key relationship
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_license_id_fkey;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_license_id_fkey
  FOREIGN KEY (license_id)
  REFERENCES licenses(id);

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