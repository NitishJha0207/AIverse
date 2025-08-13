/*
  # Fix User Registration System
  
  1. Changes
    - Update handle_new_user function to properly create user records
    - Fix RLS policies for users table
    - Add INSERT policy for users table
    - Ensure proper relationship between auth.users and public.users
*/

-- Fix function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Make sure we have an email value
  IF new.email IS NOT NULL THEN
    -- Create entry in public.users table
    INSERT INTO public.users (id, email, name)
    VALUES (
      new.id, 
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create entry in user_profiles table
    INSERT INTO user_profiles (id, full_name)
    VALUES (
      new.id,
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

-- Fix RLS policies for users table
DO $$ BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can read own data" ON users;
  DROP POLICY IF EXISTS "Users can update own data" ON users;
  DROP POLICY IF EXISTS "Users can insert own data" ON users;
  DROP POLICY IF EXISTS "Service role can insert users" ON users;
  
  -- Create comprehensive policies
  CREATE POLICY "Users can read own data"
    ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own data"
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    
  CREATE POLICY "Users can insert own data"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
    
  -- Add policy for service role during signup
  CREATE POLICY "Service role can insert users"
    ON users
    FOR INSERT
    TO anon
    WITH CHECK (true);
    
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Fix RLS policies for user_profiles table
DO $$ BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
  
  -- Create comprehensive policies
  CREATE POLICY "Users can read own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    
  CREATE POLICY "Users can insert own profile"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
    
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add phone_number column to users and user_profiles if not exists
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_number text;
  
  -- Create index for phone_number
  CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_number ON user_profiles(phone_number);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Fix the relationship between auth.users and public.users
DO $$
BEGIN
  -- First ensure all auth users have corresponding public.users entries
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
  
  -- Then ensure all public.users have corresponding user_profiles
  INSERT INTO user_profiles (id, full_name)
  SELECT 
    u.id,
    COALESCE(u.name, u.email)
  FROM public.users u
  WHERE EXISTS (
    SELECT 1 FROM auth.users WHERE id = u.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.id = u.id
  );
END $$;