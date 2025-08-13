/*
  # Add Admin User
  
  1. Changes
    - Add admin user with known credentials
    - Handle existing users safely
    - Add email field to admin_users table
*/

-- Add email column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS email text UNIQUE NOT NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create admin user if not exists
DO $$ 
DECLARE
  v_user_id uuid;
  v_email text := 'admin@pathwise.in';
  v_password text := 'AIVerse@2025';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- Create auth user if not exists
  IF v_user_id IS NULL THEN
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
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('is_admin', true),
      now(),
      now(),
      encode(gen_random_bytes(32), 'base64')
    )
    RETURNING id INTO v_user_id;
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object('is_admin', true),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Add to admin_users if not exists
  INSERT INTO admin_users (user_id, email)
  VALUES (v_user_id, v_email)
  ON CONFLICT (email) DO NOTHING;

END $$;