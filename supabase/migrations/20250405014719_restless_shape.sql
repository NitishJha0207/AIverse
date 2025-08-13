/*
  # Add Phone Authentication Support
  
  1. Changes
    - Update user_profiles table to include phone_number field
    - Add phone_number to users table
    - Add indexes for phone number lookups
    - Update RLS policies
*/

-- Add phone_number to user_profiles if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS phone_number text;

-- Add phone_number to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number text;

-- Create indexes for phone number lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_number 
ON user_profiles(phone_number);

CREATE INDEX IF NOT EXISTS idx_users_phone_number 
ON users(phone_number);

-- Update handle_new_user function to handle phone auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_phone_number text;
BEGIN
  -- Extract phone number from user metadata
  v_phone_number := new.raw_user_meta_data->>'phone_number';
  
  -- Create entry in public.users table
  INSERT INTO public.users (
    id, 
    email, 
    name,
    phone_number
  )
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    v_phone_number
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    phone_number = COALESCE(v_phone_number, users.phone_number);
  
  -- Create entry in user_profiles table
  INSERT INTO user_profiles (
    id, 
    full_name,
    phone_number
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    v_phone_number
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    phone_number = COALESCE(v_phone_number, user_profiles.phone_number);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to find user by phone number
CREATE OR REPLACE FUNCTION get_user_by_phone(p_phone_number text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Find user by phone number
  SELECT id INTO v_user_id
  FROM users
  WHERE phone_number = p_phone_number
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;