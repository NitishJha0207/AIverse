/*
  # Fix app_installations foreign key and policies
  
  1. Changes
    - Update foreign key to reference app_listings
    - Fix policy syntax
    - Preserve existing data
*/

-- First drop the existing foreign key if it exists
ALTER TABLE app_installations 
DROP CONSTRAINT IF EXISTS app_installations_app_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE app_installations
ADD CONSTRAINT app_installations_app_id_fkey 
FOREIGN KEY (app_id) 
REFERENCES app_listings(id) 
ON DELETE CASCADE;

-- Update the query in the policies to use app_listings
DROP POLICY IF EXISTS "Users can view own installations" ON app_installations;
DROP POLICY IF EXISTS "Users can manage own installations" ON app_installations;
DROP POLICY IF EXISTS "Users can update own installations" ON app_installations;
DROP POLICY IF EXISTS "Users can delete own installations" ON app_installations;

-- Create new policies with correct syntax
CREATE POLICY "Users can view own installations"
  ON app_installations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own installations"
  ON app_installations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own installations"
  ON app_installations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own installations"
  ON app_installations
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());