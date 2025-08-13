import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Moon, Sun, Bell, Shield, Trash2, Database, Download, History, Settings, AlertCircle, X } from 'lucide-react';
import { useSharedMemory } from '../context/SharedMemoryContext';
import { useAppInstallation } from '../hooks/useAppInstallation';
import { SharedMemorySetupModal } from './SharedMemorySetupModal';
import { setupSharedMemory, getSharedMemorySettings } from '../lib/supabase';
import { SharedMemorySettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

interface SettingsModalProps {
  onClose: () => void;
}

function SettingsModalContent({ onClose }: SettingsModalProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useSharedMemory();
  const { auth } = useAuth();
  const { installedApps = [], uninstallApp } = useAppInstallation();
  const [showSharedMemorySetup, setShowSharedMemorySetup] = useState(false);
  const [sharedMemorySettings, setSharedMemorySettings] = useState<SharedMemorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeSettings = async () => {
      if (!auth.isAuthenticated || !auth.user) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const settings = await getSharedMemorySettings(auth.user.id);
        if (mounted) {
          setSharedMemorySettings(settings);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch shared memory settings:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load settings');
          setLoading(false);
        }
      }
    };

    initializeSettings();

    // Check if we should show shared memory setup
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('setup') === 'shared-memory') {
      setShowSharedMemorySetup(true);
    }

    return () => {
      mounted = false;
    };
  }, [auth.isAuthenticated, auth.user, location]);

  const handleSharedMemorySetup = async (settings: SharedMemorySettings) => {
    if (!auth.user) return;
    
    try {
      setError(null);
      await setupSharedMemory(auth.user.id, settings);
      setSharedMemorySettings(settings);
      
      // Update shared memory context
      dispatch({
        type: 'UPDATE_PREFERENCES',
        payload: { shared_memory: settings }
      });

      // Clear the setup parameter from URL
      navigate(location.pathname, { replace: true });
    } catch (error) {
      console.error('Failed to setup shared memory:', error);
      setError(error instanceof Error ? error.message : 'Failed to setup shared memory');
    } finally {
      setShowSharedMemorySetup(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (!auth.user) throw new Error('Not authenticated');
      const settings = await getSharedMemorySettings(auth.user.id);
      setSharedMemorySettings(settings);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setRetrying(false);
    }
  };
  
  const handleThemeChange = (isDark: boolean) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { theme: isDark ? 'dark' : 'light' }
    });
  };

  const handleNotificationsChange = (enabled: boolean) => {
    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: { notifications: enabled }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <LoadingSpinner size="medium" message="Loading settings..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Settings</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {retrying ? (
                  <>
                    <LoadingSpinner size="small" />
                    Retrying...
                  </>
                ) : (
                  'Try Again'
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dataCategories = sharedMemorySettings?.dataCategories || {};
  const activeCategoriesCount = Object.values(dataCategories).filter(Boolean).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Settings</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Shared Memory Controls */}
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Shared Memory Layer
              </h3>
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Shared Memory Status</h4>
                    <p className="text-sm text-gray-600">
                      {sharedMemorySettings?.enabled
                        ? 'Active and managing data sharing between apps'
                        : 'Not configured'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSharedMemorySetup(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {sharedMemorySettings?.enabled ? 'Configure' : 'Set Up'}
                  </button>
                </div>

                {sharedMemorySettings?.enabled && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Storage Used</span>
                      <span className="font-medium">
                        {Math.round(sharedMemorySettings.storageQuota * 0.1)}MB / {sharedMemorySettings.storageQuota}MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Data Categories</span>
                      <span className="font-medium">
                        {activeCategoriesCount} Active
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Retention Period</span>
                      <span className="font-medium">{sharedMemorySettings.retentionPeriod} days</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Appearance */}
            <section>
              <h3 className="text-lg font-medium mb-4">Appearance</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {state.preferences.theme === 'dark' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                  <span>Dark Mode</span>
                </div>
                <button
                  onClick={() => handleThemeChange(state.preferences.theme !== 'dark')}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    state.preferences.theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      state.preferences.theme === 'dark' ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Notifications */}
            <section>
              <h3 className="text-lg font-medium mb-4">Notifications</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5" />
                  <span>App Updates & News</span>
                </div>
                <button
                  onClick={() => handleNotificationsChange(!state.preferences.notifications)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    state.preferences.notifications ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      state.preferences.notifications ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Installed Apps */}
            <section>
              <h3 className="text-lg font-medium mb-4">Installed Apps</h3>
              <div className="space-y-3">
                {installedApps.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No apps installed yet</p>
                ) : (
                  installedApps.map(app => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={app.icon_url}
                          alt={app.name}
                          className="w-8 h-8 rounded-lg"
                        />
                        <div>
                          <h4 className="font-medium">{app.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="w-4 h-4" />
                            <span>{(state.permissions[app.id] || []).length} permissions</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => uninstallApp(app.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {showSharedMemorySetup && (
        <SharedMemorySetupModal
          onClose={() => setShowSharedMemorySetup(false)}
          onSetup={handleSharedMemorySetup}
          isFirstTime={!sharedMemorySettings?.enabled}
        />
      )}
    </>
  );
}

export function SettingsModal(props: SettingsModalProps) {
  return (
    <ErrorBoundary>
      <SettingsModalContent {...props} />
    </ErrorBoundary>
  );
}