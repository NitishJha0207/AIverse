import { supabase } from './supabase';

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export async function uploadFile(file: File, bucket: string, path: string): Promise<string> {
  try {
    // Validate file
    if (!file) throw new StorageError('No file provided');
    if (file.size > 100 * 1024 * 1024) throw new StorageError('File size must be less than 100MB');

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    if (!data) throw new StorageError('Upload failed - no data returned');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;

  } catch (err) {
    console.error('File upload failed:', err);
    throw new StorageError(err instanceof Error ? err.message : 'File upload failed');
  }
}

export async function downloadFile(bucket: string, path: string): Promise<Blob> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    if (!data) throw new StorageError('Download failed - no data returned');

    return data;
  } catch (err) {
    console.error('File download failed:', err);
    throw new StorageError(err instanceof Error ? err.message : 'File download failed');
  }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  } catch (err) {
    console.error('File deletion failed:', err);
    throw new StorageError(err instanceof Error ? err.message : 'File deletion failed');
  }
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return publicUrl;
}

// Helper to get signed URL for private files
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    if (!data?.signedUrl) throw new StorageError('Failed to generate signed URL');

    return data.signedUrl;
  } catch (err) {
    console.error('Failed to get signed URL:', err);
    throw new StorageError(err instanceof Error ? err.message : 'Failed to get signed URL');
  }
}

// Helper to check if file exists
export async function fileExists(bucket: string, path: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        offset: 0,
        search: path.split('/').pop()
      });

    if (error) throw error;
    return data && data.length > 0;
  } catch (err) {
    console.error('Failed to check file existence:', err);
    return false;
  }
}