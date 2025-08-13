-- This migration file has a duplicate version number (20250407094053)
-- We'll create a new version with a different timestamp to avoid the conflict
-- but keep the same functionality

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