-- Drop existing function
DROP FUNCTION IF EXISTS add_admin(text, text);

-- Create improved add_admin function
CREATE OR REPLACE FUNCTION add_admin(email text, password text)
RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user with raw_user_meta_data
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',  -- default instance_id
    gen_random_uuid(),                        -- generate new uuid
    'authenticated',                          -- default aud
    'authenticated',                          -- default role
    email,
    crypt(password, gen_salt('bf')),
    now(),                                    -- email confirmed
    jsonb_build_object('is_admin', true),     -- user metadata
    now(),
    now(),
    encode(gen_random_bytes(32), 'base64')
  )
  RETURNING id INTO new_user_id;

  -- Add to admin_users
  INSERT INTO admin_users (user_id) VALUES (new_user_id);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;