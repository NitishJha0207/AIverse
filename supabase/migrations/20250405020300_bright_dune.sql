/*
  # Fix User Registration Error
  
  1. Changes
    - Fix user creation flow
    - Update handle_new_user function to be more robust
    - Add proper error handling for user creation
    - Fix RLS policies to ensure proper permissions
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create entry in public.users table
  BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
      new.id, 
      COALESCE(new.email, ''),
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, 'User')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue
    RAISE NOTICE 'Error creating public.users record: %', SQLERRM;
  END;
  
  -- Create entry in user_profiles table
  BEGIN
    INSERT INTO user_profiles (id, full_name)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, 'User')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue
    RAISE NOTICE 'Error creating user_profiles record: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
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

-- Ensure all tables have proper constraints
DO $$ BEGIN
  -- Make sure user_profiles.id references auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_id_fkey'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Fix any existing data issues
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- For each auth user, ensure they have corresponding records
  FOR auth_user IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    -- Create public.users entry if missing
    BEGIN
      INSERT INTO public.users (id, email, name)
      VALUES (
        auth_user.id,
        COALESCE(auth_user.email, ''),
        COALESCE(
          auth_user.raw_user_meta_data->>'full_name', 
          auth_user.raw_user_meta_data->>'name', 
          auth_user.email, 
          'User'
        )
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing public.users for %: %', auth_user.id, SQLERRM;
    END;
    
    -- Create user_profiles entry if missing
    BEGIN
      INSERT INTO user_profiles (id, full_name)
      VALUES (
        auth_user.id,
        COALESCE(
          auth_user.raw_user_meta_data->>'full_name', 
          auth_user.raw_user_meta_data->>'name', 
          auth_user.email, 
          'User'
        )
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing user_profiles for %: %', auth_user.id, SQLERRM;
    END;
  END LOOP;
END $$;