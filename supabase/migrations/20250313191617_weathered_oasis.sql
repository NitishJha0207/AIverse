/*
  # Helper Functions
  
  1. New Functions
    - check_app_permission: Verify app permissions
    - check_memory_access: Check shared memory access
*/

-- Create helper functions
CREATE OR REPLACE FUNCTION check_app_permission(
  p_user_id uuid,
  p_app_id uuid,
  p_permission_type text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_permissions
    WHERE user_id = p_user_id
    AND app_id = p_app_id
    AND permission_type = p_permission_type
    AND is_granted = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_memory_access(
  p_user_id uuid,
  p_app_id uuid,
  p_access_type text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_memory_access
    WHERE user_id = p_user_id
    AND app_id = p_app_id
    AND (
      access_type = p_access_type
      OR access_type = 'read_write'
    )
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;