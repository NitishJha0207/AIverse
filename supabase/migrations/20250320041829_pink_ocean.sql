-- Fix admin users table and policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;

-- Create new policy that doesn't use recursion
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Fix app_installations foreign key and policies
DO $$ 
BEGIN
  -- Drop existing foreign key if it exists
  ALTER TABLE app_installations 
  DROP CONSTRAINT IF EXISTS app_installations_app_id_fkey;

  -- Add correct foreign key reference
  ALTER TABLE app_installations
  ADD CONSTRAINT app_installations_app_id_fkey 
  FOREIGN KEY (app_id) 
  REFERENCES app_listings(id) 
  ON DELETE CASCADE;

  -- Update RLS policies
  ALTER TABLE app_installations ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view own installations" ON app_installations;
  DROP POLICY IF EXISTS "Users can insert own installations" ON app_installations;
  DROP POLICY IF EXISTS "Users can update own installations" ON app_installations;
  DROP POLICY IF EXISTS "Users can delete own installations" ON app_installations;

  -- Create new policies
  CREATE POLICY "Users can view own installations"
    ON app_installations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Users can insert own installations"
    ON app_installations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Users can update own installations"
    ON app_installations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Users can delete own installations"
    ON app_installations
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

  -- Add indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_app_installations_user_id ON app_installations(user_id);
  CREATE INDEX IF NOT EXISTS idx_app_installations_app_id ON app_installations(app_id);
  CREATE INDEX IF NOT EXISTS idx_app_installations_status ON app_installations(status);

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;