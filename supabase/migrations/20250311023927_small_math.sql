/*
  # Configure storage buckets and policies
  
  1. New Buckets
    - app_logos: For app icons and logos
    - app_screenshots: For app screenshots
    - app_binaries: For app binary files (if not exists)
    
  2. Security
    - Public read access for logos and screenshots
    - Authenticated access for binaries
    - Developer-only write access
*/

-- Function to check if bucket exists
CREATE OR REPLACE FUNCTION bucket_exists(bucket_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  );
END;
$$ LANGUAGE plpgsql;

-- Create buckets if they don't exist
DO $$ 
BEGIN
  -- app_logos bucket
  IF NOT bucket_exists('app_logos') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('app_logos', 'app_logos', true);
  END IF;

  -- app_screenshots bucket
  IF NOT bucket_exists('app_screenshots') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('app_screenshots', 'app_screenshots', true);
  END IF;

  -- app_binaries bucket
  IF NOT bucket_exists('app_binaries') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('app_binaries', 'app_binaries', false);
  END IF;
END $$;

-- Function to check if policy exists
CREATE OR REPLACE FUNCTION storage_policy_exists(policy_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- app_logos policies
  IF NOT storage_policy_exists('app_logos_public_select') THEN
    CREATE POLICY "app_logos_public_select"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'app_logos');
  END IF;

  IF NOT storage_policy_exists('app_logos_developer_insert') THEN
    CREATE POLICY "app_logos_developer_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'app_logos' AND
        auth.role() = 'authenticated' AND
        EXISTS (
          SELECT 1 FROM developer_profiles
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- app_screenshots policies
  IF NOT storage_policy_exists('app_screenshots_public_select') THEN
    CREATE POLICY "app_screenshots_public_select"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'app_screenshots');
  END IF;

  IF NOT storage_policy_exists('app_screenshots_developer_insert') THEN
    CREATE POLICY "app_screenshots_developer_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'app_screenshots' AND
        auth.role() = 'authenticated' AND
        EXISTS (
          SELECT 1 FROM developer_profiles
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- app_binaries policies
  IF NOT storage_policy_exists('app_binaries_developer_all') THEN
    CREATE POLICY "app_binaries_developer_all"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'app_binaries' AND
        auth.role() = 'authenticated' AND
        EXISTS (
          SELECT 1 FROM developer_profiles
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop helper functions
DROP FUNCTION IF EXISTS bucket_exists(text);
DROP FUNCTION IF EXISTS storage_policy_exists(text);