import { supabase } from './supabase';
import type { AppListing, AppInstallation, InstallationProgress } from '../types';

export class InstallationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstallationError';
  }
}

export async function installApp(
  app: AppListing,
  onProgress?: (progress: InstallationProgress) => void
): Promise<AppInstallation> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new InstallationError('User not authenticated');

    // Create installation record
    const { data: installation, error: createError } = await supabase
      .from('app_installations')
      .insert({
        app_id: app.id,
        user_id: user.id,
        version: app.version || '1.0.0',
        status: 'pending',
        progress: 0
      })
      .select('*, app:app_listings(*)')
      .single();

    if (createError) throw createError;
    if (!installation) throw new InstallationError('Failed to create installation');

    onProgress?.({ status: 'pending', progress: 0 });

    // Start download
    onProgress?.({ status: 'downloading', progress: 0 });
    
    if (!app.binary_url) {
      throw new InstallationError('App binary not available');
    }

    // Download the binary
    const { data: binaryData, error: downloadError } = await supabase.storage
      .from('app-binaries')
      .download(app.binary_url);

    if (downloadError) throw downloadError;
    if (!binaryData) throw new InstallationError('Failed to download app binary');

    onProgress?.({ status: 'downloading', progress: 50 });

    // Verify binary integrity
    const checksum = await calculateChecksum(binaryData);
    onProgress?.({ status: 'downloading', progress: 75 });

    // Start installation
    onProgress?.({ status: 'installing', progress: 0 });

    // Simulate installation process (in a real app, this would handle actual installation)
    await new Promise(resolve => setTimeout(resolve, 1500));
    onProgress?.({ status: 'installing', progress: 50 });

    // Update installation record
    const { error: updateError } = await supabase
      .from('app_installations')
      .update({
        status: 'installed',
        progress: 100,
        installed_at: new Date().toISOString()
      })
      .eq('id', installation.id);

    if (updateError) throw updateError;

    onProgress?.({ status: 'installed', progress: 100 });

    return {
      ...installation,
      status: 'installed',
      progress: 100,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Installation failed';
    onProgress?.({ 
      status: 'failed', 
      progress: 0, 
      error: errorMessage 
    });
    throw new InstallationError(errorMessage);
  }
}

export async function uninstallApp(appId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new InstallationError('User not authenticated');

    const { error } = await supabase
      .from('app_installations')
      .update({ status: 'uninstalled' })
      .eq('app_id', appId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    throw new InstallationError(
      error instanceof Error ? error.message : 'Failed to uninstall app'
    );
  }
}

export async function getInstallationStatus(appId: string): Promise<AppInstallation | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('app_installations')
      .select(`
        id,
        app_id,
        user_id,
        version,
        status,
        progress,
        error,
        installed_at,
        created_at,
        updated_at,
        app:app_listings(*)
      `)
      .eq('app_id', appId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      appId: data.app_id,
      userId: data.user_id,
      version: data.version,
      status: data.status,
      progress: data.progress,
      error: data.error,
      installedAt: data.installed_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Failed to get installation status:', error);
    return null;
  }
}

async function calculateChecksum(data: Blob): Promise<string> {
  const buffer = await data.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}