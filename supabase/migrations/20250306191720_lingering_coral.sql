/*
  # Developer Profiles Schema Update
  
  1. Changes
    - Clean up duplicate developer profiles
    - Add unique constraint on user_id
    - Add foreign key constraint to auth.users
    - Add payment status validation
    - Add indexes for performance
    - Enable RLS with appropriate policies
  
  2. Security
    - Enable RLS
    - Add policies for developers to manage their own profiles
    - Add helper function for checking developer status
*/

-- First, clean up duplicate profiles by keeping only the most recent one
DELETE FROM developer_profiles a USING (
  SELECT user_id, MAX(created_at) as max_created_at
  FROM developer_profiles
  GROUP BY user_id
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id
AND a.created_at < b.max_created_at;

-- Now add unique constraint
ALTER TABLE developer_profiles
ADD CONSTRAINT developer_profiles_user_id_key UNIQUE (user_id);

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'developer_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE developer_profiles
    ADD CONSTRAINT developer_profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add validation check for payment_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'developer_profiles_payment_status_check'
  ) THEN
    ALTER TABLE developer_profiles
    ADD CONSTRAINT developer_profiles_payment_status_check
    CHECK (payment_status IN ('pending', 'active', 'suspended'));
  END IF;
END $$;

-- Add index for user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'developer_profiles' 
    AND indexname = 'idx_developer_profiles_user_id'
  ) THEN
    CREATE INDEX idx_developer_profiles_user_id ON developer_profiles(user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Developers can view own profile" ON developer_profiles;
DROP POLICY IF EXISTS "Developers can update own profile" ON developer_profiles;

-- Add RLS policies
CREATE POLICY "Developers can view own profile"
ON developer_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Developers can update own profile"
ON developer_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop existing function if any
DROP FUNCTION IF EXISTS is_developer(uuid);

-- Add helper function to check if user is developer
CREATE OR REPLACE FUNCTION is_developer(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM developer_profiles
    WHERE user_id = $1 AND payment_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;