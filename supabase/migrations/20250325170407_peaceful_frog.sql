-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
  DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
  DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
  DROP POLICY IF EXISTS "Admins can manage app listings" ON app_listings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new non-recursive policies
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app listings"
  ON app_listings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = auth.uid()
    AND a.user_id IS NOT NULL
    LIMIT 1
  ));

-- Safely add email column if it doesn't exist
DO $$ BEGIN
  -- First check if column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
    AND column_name = 'email'
  ) THEN
    -- Add column and constraint only if they don't exist
    ALTER TABLE admin_users ADD COLUMN email text;
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
  END IF;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create or update admin user
DO $$ 
DECLARE
  v_user_id uuid;
  v_email text := 'admin@pathwise.in';
  v_password text := 'AIVerse@2025';
BEGIN
  -- First check if auth user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- Create auth user if not exists
  IF v_user_id IS NULL THEN
    -- Create new auth user
    v_user_id := gen_random_uuid();
    
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
    ) VALUES (
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
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('is_admin', true),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Ensure admin_users entry exists
  INSERT INTO admin_users (user_id, email)
  VALUES (v_user_id, v_email)
  ON CONFLICT (email) DO UPDATE
  SET user_id = EXCLUDED.user_id;

END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Update is_admin function to be more efficient
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users a
    WHERE a.user_id = $1
    AND a.user_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;