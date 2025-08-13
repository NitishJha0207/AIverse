/*
  # Configure storage buckets and policies
  
  1. New Buckets
    - app_logos: For app icons and logos
    - app_screenshots: For app screenshots
    - app_binaries: For app binary files
    
  2. Security
    - Public read access for logos and screenshots
    - Authenticated access for binaries
    - Developer-only write access
*/

-- Enable storage by creating buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('app_logos', 'app_logos', true),
  ('app_screenshots', 'app_screenshots', true),
  ('app_binaries', 'app_binaries', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for app_logos bucket
CREATE POLICY "app_logos_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app_logos');

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

-- Set up storage policies for app_screenshots bucket
CREATE POLICY "app_screenshots_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app_screenshots');

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

-- Set up storage policies for app_binaries bucket
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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;