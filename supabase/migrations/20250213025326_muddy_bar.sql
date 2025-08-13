/*
  # Add App Binary Storage Support

  1. Storage
    - Create bucket for app binaries
    - Set up security policies for binary access

  2. Security
    - Enable RLS for storage bucket
    - Add policies for developer uploads and user downloads
*/

-- Enable storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-binaries', 'app-binaries', false);

-- Storage policies
CREATE POLICY "Developers can upload app binaries"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'app-binaries'
    AND EXISTS (
      SELECT 1 FROM apps
      WHERE apps.id::text = (storage.foldername(name))[1]
      AND apps.developer_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can download approved app binaries"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'app-binaries'
    AND EXISTS (
      SELECT 1 FROM apps
      WHERE apps.id::text = (storage.foldername(name))[1]
      AND apps.status = 'approved'
    )
  );

CREATE POLICY "Developers can manage their app binaries"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'app-binaries'
    AND EXISTS (
      SELECT 1 FROM apps
      WHERE apps.id::text = (storage.foldername(name))[1]
      AND apps.developer_id = auth.uid()
    )
  );