/*
  # Fix Authentication System
  
  1. Changes
    - Fix user creation flow
    - Add admin and test users
    - Ensure proper profile creation
    - Fix foreign key constraints
*/

-- Fix function to handle new user creation first
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Make sure we have an email value
  IF new.email IS NOT NULL THEN
    INSERT INTO public.users (id, email, name)
    VALUES (
      new.id, 
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
    -- Generate a UUID for the new user
    v_user_id := gen_random_uuid();
    
    -- Insert the new user directly (without ON CONFLICT)
    BEGIN
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
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_password, gen_salt('bf')),
        now(),
        jsonb_build_object('is_admin', true),
        now(),
        now(),
        encode(gen_random_bytes(32), 'base64')
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a unique violation, get the existing user's ID
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_email;
    END;
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object('is_admin', true),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Ensure the user has a public.users entry
  INSERT INTO public.users (id, email, name)
  VALUES (v_user_id, v_email, 'Admin User')
  ON CONFLICT (id) DO NOTHING;

  -- Add to admin_users if not exists
  INSERT INTO admin_users (user_id, email)
  VALUES (v_user_id, v_email)
  ON CONFLICT (email) DO NOTHING;
END $$;

-- Create test user for login testing
DO $$
DECLARE
  v_test_user_id uuid;
  v_test_email text := 'test@example.com';
  v_test_password text := 'password123';
BEGIN
  -- Check if test user exists
  SELECT id INTO v_test_user_id
  FROM auth.users
  WHERE email = v_test_email;
  
  -- Only create if it doesn't exist
  IF v_test_user_id IS NULL THEN
    -- Generate a UUID for the test user
    v_test_user_id := gen_random_uuid();
    
    -- Insert the test user
    BEGIN
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
        v_test_user_id,
        'authenticated',
        'authenticated',
        v_test_email,
        crypt(v_test_password, gen_salt('bf')),
        now(),
        jsonb_build_object('name', 'Test User'),
        now(),
        now(),
        encode(gen_random_bytes(32), 'base64')
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- If there's a unique violation, get the existing user's ID
        SELECT id INTO v_test_user_id
        FROM auth.users
        WHERE email = v_test_email;
    END;
    
    -- Ensure the user has a public.users entry
    INSERT INTO public.users (id, email, name)
    VALUES (v_test_user_id, v_test_email, 'Test User')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Ensure all auth users have corresponding public.users entries
DO $$
BEGIN
  INSERT INTO public.users (id, email, name)
  SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
  FROM auth.users
  WHERE email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.users.id
  );
END $$;

-- Create user_profiles for any users that don't have them
DO $$
BEGIN
  -- First ensure all users in auth.users have entries in public.users
  INSERT INTO public.users (id, email, name)
  SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
  FROM auth.users
  WHERE email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.users.id
  );
  
  -- Then create user_profiles only for users that exist in public.users
  INSERT INTO user_profiles (id, full_name)
  SELECT 
    u.id,
    COALESCE(u.name, u.email)
  FROM public.users u
  WHERE EXISTS (
    SELECT 1 FROM auth.users WHERE auth.users.id = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.id = u.id
  );
END $$;