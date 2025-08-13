import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { checkForUpdates, setAppVersion } from '../lib/appUpdates';
import { logger } from '../lib/logging';

interface AppUpdatePromptProps {
  onUpdate: () => void;
}

export function AppUpdatePrompt({ onUpdate }: AppUpdatePromptProps) {
  const [show, setShow] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const { hasUpdate, forceUpdate, changes } = await checkForUpdates();
        
        if (hasUpdate) {
          setShow(true);
          setForceUpdate(forceUpdate);
          setChanges(changes || []);
          
          logger.info({
            hasUpdate,
            forceUpdate,
            changes,
            platform: 'mobile'
          }, 'Update available');
        }
      } catch (error) {
        logger.error({ error, platform: 'mobile' }, 'Failed to check for updates');
      }
    };

    // Check immediately on load
    checkUpdate();

    // Set up periodic checks
    const interval = setInterval(checkUpdate, 5 * 60 * 1000); // Check every 5 minutes

    // Check when the page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      // Update version in localStorage
      const newVersion = '1.0.1'; // This would normally come from the server
      setAppVersion(newVersion);
      
      // Clear caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }

      // Reload the page
      setShow(false);
      onUpdate();

      logger.info({ version: newVersion, platform: 'mobile' }, 'App updated successfully');
    } catch (error) {
      logger.error({ error, platform: 'mobile' }, 'Failed to apply update');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="font-medium">A new version is available!</p>
            {changes.length > 0 && (
              <ul className="text-sm text-gray-600 mt-1">
                {changes.map((change, index) => (
                  <li key={index}>• {change}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Update Now
          </button>
          {!forceUpdate && (
            <button
              onClick={() => setShow(false)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}