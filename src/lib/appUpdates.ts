import { supabase } from './supabase';
import { logger } from './logging';

const APP_VERSION_KEY = 'app-version';
const APP_LAST_CHECK_KEY = 'app-last-check';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface AppVersion {
  version: string;
  force_update: boolean;
  changes: string[];
  min_version: string;
}

export async function checkForUpdates(): Promise<{
  hasUpdate: boolean;
  forceUpdate: boolean;
  changes?: string[];
}> {
  const updateLogger = logger.child({ component: 'appUpdates' });

  try {
    // Check if we've checked recently
    const lastCheck = localStorage.getItem(APP_LAST_CHECK_KEY);
    if (lastCheck && Date.now() - parseInt(lastCheck) < CHECK_INTERVAL) {
      return { hasUpdate: false, forceUpdate: false };
    }

    // Get current version
    const currentVersion = localStorage.getItem(APP_VERSION_KEY) || '1.0.0';

    updateLogger.debug({ currentVersion, platform: 'mobile' }, 'Checking for updates');

    // Get latest version from server
    const { data: versionData, error } = await supabase
      .from('app_versions')
      .select('version, force_update, min_version, changes')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No versions found, treat as no update
        updateLogger.info('No version data found');
        return { hasUpdate: false, forceUpdate: false };
      }
      throw error;
    }

    if (!versionData) {
      updateLogger.info('No version data returned');
      return { hasUpdate: false, forceUpdate: false };
    }

    const latestVersion = versionData as AppVersion;

    // Update last check time
    localStorage.setItem(APP_LAST_CHECK_KEY, Date.now().toString());

    updateLogger.debug({ 
      currentVersion,
      latestVersion: latestVersion.version,
      forceUpdate: latestVersion.force_update,
      minVersion: latestVersion.min_version,
      platform: 'mobile'
    }, 'Version check complete');

    // Compare versions
    if (compareVersions(latestVersion.version, currentVersion) > 0) {
      // Check if current version is below minimum required
      const forceUpdate = latestVersion.min_version && 
        compareVersions(currentVersion, latestVersion.min_version) < 0;

      updateLogger.info({
        currentVersion,
        latestVersion: latestVersion.version,
        forceUpdate: forceUpdate || latestVersion.force_update,
        changes: latestVersion.changes,
        platform: 'mobile'
      }, 'Update available');

      // Clear all caches
      if ('caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys.map(key => caches.delete(key))
          );
          updateLogger.info('Cache cleared for update');
        } catch (err) {
          updateLogger.error({ error: err }, 'Failed to clear cache');
        }
      }

      // Clear service worker
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(registration => registration.unregister())
          );
          updateLogger.info('Service worker unregistered');
        } catch (err) {
          updateLogger.error({ error: err }, 'Failed to unregister service worker');
        }
      }

      return {
        hasUpdate: true,
        forceUpdate: forceUpdate || latestVersion.force_update,
        changes: latestVersion.changes
      };
    }

    updateLogger.debug('No update needed');
    return { hasUpdate: false, forceUpdate: false };
  } catch (error) {
    updateLogger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      platform: 'mobile'
    }, 'Failed to check for updates');
    
    return { hasUpdate: false, forceUpdate: false };
  }
}

export function setAppVersion(version: string) {
  const updateLogger = logger.child({ component: 'appUpdates' });
  
  try {
    localStorage.setItem(APP_VERSION_KEY, version);
    localStorage.setItem(APP_LAST_CHECK_KEY, Date.now().toString());
    
    updateLogger.info({ version, platform: 'mobile' }, 'App version updated');

    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }

    // Clear service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
  } catch (error) {
    updateLogger.error({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      version,
      platform: 'mobile'
    }, 'Failed to set app version');
  }
}

// Compare version strings (returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal)
function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  return 0;
}