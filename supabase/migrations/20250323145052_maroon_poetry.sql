/*
  # Security Framework Functions
  
  1. Enhanced Permission Functions
    - Temporal permission checks
    - Permission inheritance
    - Permission scope validation
    
  2. Shared Memory Functions
    - Data encryption
    - Version management
    - Access auditing
*/

-- Function to grant temporal permission
CREATE OR REPLACE FUNCTION grant_temporal_permission(
  p_user_id uuid,
  p_app_id uuid,
  p_permission_type text,
  p_duration interval,
  p_scope jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_permission_id uuid;
BEGIN
  INSERT INTO app_permissions (
    user_id,
    app_id,
    permission_type,
    is_granted,
    expires_at,
    permission_scope
  ) VALUES (
    p_user_id,
    p_app_id,
    p_permission_type,
    true,
    now() + p_duration,
    COALESCE(p_scope, '{}'::jsonb)
  ) RETURNING id INTO v_permission_id;

  RETURN v_permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to inherit permissions
CREATE OR REPLACE FUNCTION inherit_permissions(
  p_from_app_id uuid,
  p_to_app_id uuid,
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  INSERT INTO app_permissions (
    user_id,
    app_id,
    permission_type,
    is_granted,
    expires_at,
    inherited_from,
    permission_scope
  )
  SELECT
    p_user_id,
    p_to_app_id,
    permission_type,
    is_granted,
    expires_at,
    id,
    permission_scope
  FROM app_permissions
  WHERE app_id = p_from_app_id
  AND user_id = p_user_id
  AND is_granted = true
  AND (expires_at IS NULL OR expires_at > now())
  ON CONFLICT (app_id, user_id, permission_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_shared_memory_data(
  p_data jsonb,
  p_encryption_key_id uuid
) RETURNS bytea AS $$
DECLARE
  v_encrypted bytea;
BEGIN
  -- In a real implementation, this would use proper encryption
  -- For now, we'll just encode as base64
  v_encrypted := encode(
    p_data::text::bytea,
    'base64'
  )::bytea;
  
  RETURN v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_shared_memory_data(
  p_encrypted_data bytea,
  p_encryption_key_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_decrypted text;
BEGIN
  -- In a real implementation, this would use proper decryption
  -- For now, we'll just decode from base64
  v_decrypted := convert_from(
    decode(
      convert_to(p_encrypted_data::text, 'UTF8'),
      'base64'
    ),
    'UTF8'
  );
  
  RETURN v_decrypted::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new data version
CREATE OR REPLACE FUNCTION create_shared_memory_version(
  p_action_id uuid,
  p_data jsonb,
  p_encrypt boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
  v_version_id uuid;
  v_version_number integer;
  v_encrypted_data bytea;
  v_encryption_key_id uuid;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM shared_memory_versions
  WHERE action_id = p_action_id;

  -- Encrypt data if requested
  IF p_encrypt THEN
    -- In real implementation, would generate/retrieve encryption key
    v_encryption_key_id := gen_random_uuid();
    v_encrypted_data := encrypt_shared_memory_data(p_data, v_encryption_key_id);
  END IF;

  -- Create new version
  INSERT INTO shared_memory_versions (
    action_id,
    version_number,
    data,
    encrypted_data,
    encryption_key_id,
    created_by
  ) VALUES (
    p_action_id,
    v_version_number,
    CASE WHEN p_encrypt THEN '{}'::jsonb ELSE p_data END,
    v_encrypted_data,
    v_encryption_key_id,
    auth.uid()
  ) RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to audit shared memory access
CREATE OR REPLACE FUNCTION audit_shared_memory_access(
  p_user_id uuid,
  p_app_id uuid,
  p_action_id uuid,
  p_access_type text,
  p_success boolean,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO app_monitoring_events (
    app_id,
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_app_id,
    p_user_id,
    'security_violation',
    CASE WHEN p_success THEN 'info' ELSE 'warning' END,
    jsonb_build_object(
      'action_id', p_action_id,
      'access_type', p_access_type,
      'success', p_success,
      'details', p_details
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;