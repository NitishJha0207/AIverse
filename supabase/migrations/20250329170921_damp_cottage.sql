-- First ensure all tables have proper relationships
DO $$ BEGIN
  -- Ensure developer_profiles has correct relationship with users
  ALTER TABLE developer_profiles
  DROP CONSTRAINT IF EXISTS developer_profiles_user_id_fkey;
  
  ALTER TABLE developer_profiles
  ADD CONSTRAINT developer_profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

  -- Ensure app_submissions has correct relationship with developer_profiles
  ALTER TABLE app_submissions
  DROP CONSTRAINT IF EXISTS app_submissions_developer_id_fkey;
  
  ALTER TABLE app_submissions
  ADD CONSTRAINT app_submissions_developer_id_fkey
  FOREIGN KEY (developer_id)
  REFERENCES developer_profiles(id)
  ON DELETE CASCADE;

EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Temporarily disable app processing trigger
DROP TRIGGER IF EXISTS start_app_processing ON app_submissions;

-- Add test data
DO $$ 
DECLARE
  v_user_id uuid;
  v_dev_profile_id uuid;
  v_app_id uuid;
BEGIN
  -- Generate a UUID for the test user
  v_user_id := gen_random_uuid();

  -- Create test user if not exists
  INSERT INTO public.users (id, email, name, is_developer)
  VALUES (
    v_user_id,
    'test.dev@example.com',
    'Test Developer',
    true
  )
  ON CONFLICT (email) 
  DO UPDATE SET 
    is_developer = true
  RETURNING id INTO v_user_id;

  -- Create developer profile if not exists
  INSERT INTO developer_profiles (
    user_id,
    company_name,
    team_size,
    profession,
    country,
    payment_status
  )
  VALUES (
    v_user_id,
    'Test Company',
    'solo',
    'Developer',
    'Test Country',
    'active'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    payment_status = 'active'
  RETURNING id INTO v_dev_profile_id;

  -- Create test app submission
  INSERT INTO app_submissions (
    developer_id,
    name,
    description,
    short_description,
    category,
    price,
    icon_url,
    status,
    submission_date,
    version,
    metadata
  )
  VALUES (
    v_dev_profile_id,
    'Test App',
    'A test app for development',
    'Test app short description',
    'developer',
    9.99,
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713',
    'pending_review',
    now(),
    '1.0.0',
    jsonb_build_object(
      'build_config', jsonb_build_object(
        'node_version', '20',
        'build_command', 'npm run build',
        'output_dir', 'dist'
      )
    )
  )
  ON CONFLICT DO NOTHING;

END $$;

-- Re-enable app processing trigger
CREATE TRIGGER start_app_processing
  AFTER INSERT ON app_submissions
  FOR EACH ROW
  EXECUTE FUNCTION initiate_app_processing();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_submissions_status ON app_submissions(status);
CREATE INDEX IF NOT EXISTS idx_app_submissions_developer_id ON app_submissions(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_profiles_user_id ON developer_profiles(user_id);

-- Update existing submissions to pending_review if they're in draft state
UPDATE app_submissions 
SET status = 'pending_review'
WHERE status = 'draft' 
AND submission_date < now() - interval '1 hour';