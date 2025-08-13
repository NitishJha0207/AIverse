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

-- Create admin user if not exists
DO $$ 
DECLARE
  v_user_id uuid;
  v_email text := 'admin@pathwise.in';
  v_password text := 'AIVerse@2025';
BEGIN
  -- Check if user exists in auth.users
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
    SELECT
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
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = v_email
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Get user_id if we didn't create one
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email;
  END IF;

  -- Add to admin_users if not exists
  INSERT INTO admin_users (user_id, email)
  VALUES (v_user_id, v_email)
  ON CONFLICT (email) DO NOTHING;

END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

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