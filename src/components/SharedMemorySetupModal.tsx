import React, { useState } from 'react';
import { Settings, Shield, Database, Clock, HardDrive } from 'lucide-react';
import { SharedMemorySettings } from '../types';
import { useAuth } from '../context/AuthContext';

interface SharedMemorySetupModalProps {
  onClose: () => void;
  onSetup: (settings: SharedMemorySettings) => Promise<void>;
  isFirstTime?: boolean;
}

export function SharedMemorySetupModal({ onClose, onSetup, isFirstTime = false }: SharedMemorySetupModalProps) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SharedMemorySettings>({
    enabled: true,
    storageQuota: 1024, // 1GB in MB
    retentionPeriod: 90, // days
    autoSync: true,
    syncInterval: 60, // minutes
    dataCategories: {
      actions: true,
      preferences: true,
      history: true,
      userContent: false
    },
    accessControl: {
      allowedApps: [],
      blockedApps: [],
      dataSharing: 'selected',
      requireConsent: true
    }
  });

  const handleSubmit = async () => {
    if (!auth.user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSetup(settings);
      onClose();
    } catch (error) {
      console.error('Failed to setup shared memory:', error);
      setError(error instanceof Error ? error.message : 'Failed to setup shared memory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold">
              {isFirstTime ? 'Set Up Shared Memory Layer' : 'Shared Memory Settings'}
            </h2>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {isFirstTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              The shared memory layer allows you to control how your data is shared between AI apps.
              This gives you more control over your privacy and data usage.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Settings */}
          <section>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Basic Settings
            </h3>
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Enable Shared Memory</h4>
                  <p className="text-sm text-gray-600">Allow apps to access shared data storage</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.enabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage Quota (MB)
                </label>
                <input
                  type="number"
                  value={settings.storageQuota}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    storageQuota: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention Period (days)
                </label>
                <input
                  type="number"
                  value={settings.retentionPeriod}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    retentionPeriod: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* Data Categories */}
          <section>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              Data Categories
            </h3>
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              {Object.entries(settings.dataCategories).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium capitalize">{key}</h4>
                    <p className="text-sm text-gray-600">
                      Share {key} data between apps
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      dataCategories: {
                        ...prev.dataCategories,
                        [key]: !value
                      }
                    }))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      value ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        value ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Access Control */}
          <section>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Access Control
            </h3>
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Sharing
                </label>
                <select
                  value={settings.accessControl.dataSharing}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    accessControl: {
                      ...prev.accessControl,
                      dataSharing: e.target.value as 'all' | 'selected' | 'none'
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Apps</option>
                  <option value="selected">Selected Apps Only</option>
                  <option value="none">No Apps</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Require Consent</h4>
                  <p className="text-sm text-gray-600">
                    Ask for permission before sharing data
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    accessControl: {
                      ...prev.accessControl,
                      requireConsent: !prev.accessControl.requireConsent
                    }
                  }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.accessControl.requireConsent ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.accessControl.requireConsent ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Sync Settings */}
          <section>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Sync Settings
            </h3>
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto Sync</h4>
                  <p className="text-sm text-gray-600">
                    Automatically sync data between apps
                  </p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    autoSync: !prev.autoSync
                  }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings.autoSync ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.autoSync ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {settings.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sync Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.syncInterval}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      syncInterval: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              isFirstTime ? 'Set Up Shared Memory' : 'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}