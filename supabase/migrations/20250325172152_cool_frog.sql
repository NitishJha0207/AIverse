-- Drop existing policies to prevent recursion
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
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage app versions"
  ON app_versions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  ));

CREATE POLICY "Admins can view all error logs"
  ON error_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  ));

CREATE POLICY "Admins can manage app listings"
  ON app_listings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
  ));

-- Drop and recreate admin user
DO $$ 
DECLARE
  v_user_id uuid;
  v_email text := 'admin@pathwise.in';
BEGIN
  -- Delete existing admin entries to start fresh
  DELETE FROM admin_users WHERE email = v_email;
  
  -- Get or create auth user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- Create new auth user
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
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt('AIVerse@2025', gen_salt('bf')),
      now(),
      jsonb_build_object('is_admin', true),
      now(),
      now(),
      encode(gen_random_bytes(32), 'base64')
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Create admin user entry
  INSERT INTO admin_users (user_id, email)
  VALUES (v_user_id, v_email);

END $$;

-- Update is_admin function to be simpler
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = $1
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;