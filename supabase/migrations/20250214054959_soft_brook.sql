/*
  # Fix authentication and user profiles

  1. Changes
    - Drop and recreate user_profiles table with correct schema
    - Add proper RLS policies for authentication
    - Add trigger for automatic profile creation

  2. Security
    - Enable RLS on user_profiles table
    - Add policies for authenticated users
*/

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Recreate the user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  date_of_birth date,
  country text,
  hobbies text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  privacy_settings jsonb DEFAULT '{
    "share_location": false,
    "share_phone": false,
    "share_preferences": false,
    "share_hobbies": false,
    "share_name": false,
    "share_country": false,
    "share_dob": false
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();