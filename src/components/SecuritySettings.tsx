import React, { useState, useEffect } from 'react';
import { Shield, Lock, Database, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { logger } from '../lib/logging';

interface AppPermission {
  id: string;
  app_id: string;
  permission_type: string;
  is_granted: boolean;
}

interface MemoryAccess {
  id: string;
  app_id: string;
  access_type: string;
  data_scope: string[];
}

interface SecuritySettingsProps {
  appId: string;
  onClose: () => void;
}

export function SecuritySettings({ appId, onClose }: SecuritySettingsProps) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [memoryAccess, setMemoryAccess] = useState<MemoryAccess | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize default permissions
  const defaultPermissions = [
    'basic_profile',
    'preferences',
    'file_system'
  ];

  useEffect(() => {
    const fetchSecuritySettings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication first
        if (!auth.isAuthenticated) {
          setError('Please log in or register to access security settings');
          setLoading(false);
          return;
        }

        // Fetch permissions
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('app_permissions')
          .select('*')
          .eq('app_id', appId)
          .eq('user_id', auth.user?.id);

        if (permissionsError) throw permissionsError;

        // Initialize permissions with defaults if none exist
        const initialPermissions = defaultPermissions.map(type => {
          const existingPermission = permissionsData?.find(p => p.permission_type === type);
          return existingPermission || {
            id: `temp-${type}`,
            app_id: appId,
            permission_type: type,
            is_granted: false
          };
        });

        setPermissions(initialPermissions);

        // Fetch memory access
        const { data: memoryData, error: memoryError } = await supabase
          .from('shared_memory_access')
          .select('*')
          .eq('app_id', appId)
          .eq('user_id', auth.user?.id)
          .single();

        if (memoryError && memoryError.code !== 'PGRST116') throw memoryError;

        setMemoryAccess(memoryData || null);
      } catch (err) {
        logger.error({ error: err, appId }, 'Failed to fetch security settings');
        setError(err instanceof Error ? err.message : 'Failed to load security settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSecuritySettings();
  }, [appId, auth.isAuthenticated, auth.user?.id]);

  const handlePermissionChange = async (permissionType: string, granted: boolean) => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      setError('Please log in or register to modify security settings');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Optimistically update UI
      setPermissions(prev => 
        prev.map(p => 
          p.permission_type === permissionType 
            ? { ...p, is_granted: granted }
            : p
        )
      );

      // Delete existing permission if any
      await supabase
        .from('app_permissions')
        .delete()
        .eq('app_id', appId)
        .eq('user_id', auth.user.id)
        .eq('permission_type', permissionType);

      // Insert new permission
      const { error: insertError } = await supabase
        .from('app_permissions')
        .insert({
          app_id: appId,
          user_id: auth.user.id,
          permission_type: permissionType,
          is_granted: granted
        });

      if (insertError) throw insertError;

      logger.info({
        appId,
        permissionType,
        granted
      }, 'Permission updated successfully');

    } catch (err) {
      logger.error({ 
        error: err,
        appId,
        permissionType,
        granted
      }, 'Failed to update permission');
      
      // Revert UI state on error
      setPermissions(prev => 
        prev.map(p => 
          p.permission_type === permissionType 
            ? { ...p, is_granted: !granted }
            : p
        )
      );
      
      setError(err instanceof Error ? err.message : 'Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const handleMemoryAccessChange = async (accessType: string) => {
    if (!auth.isAuthenticated || !auth.user?.id) {
      setError('Please log in or register to modify security settings');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Optimistically update UI
      setMemoryAccess(prev => ({
        ...prev!,
        access_type: accessType
      }));

      // Delete existing access if any
      await supabase
        .from('shared_memory_access')
        .delete()
        .eq('app_id', appId)
        .eq('user_id', auth.user.id);

      // Insert new access
      const { error: insertError } = await supabase
        .from('shared_memory_access')
        .insert({
          app_id: appId,
          user_id: auth.user.id,
          access_type: accessType,
          data_scope: ['basic_profile', 'preferences']
        });

      if (insertError) throw insertError;

      logger.info({
        appId,
        accessType
      }, 'Memory access updated successfully');

    } catch (err) {
      logger.error({ 
        error: err,
        appId,
        accessType
      }, 'Failed to update memory access');
      
      // Revert UI state on error
      setMemoryAccess(prev => ({
        ...prev!,
        access_type: prev?.access_type || 'read'
      }));
      
      setError(err instanceof Error ? err.message : 'Failed to update memory access');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="large" message="Loading security settings..." />
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!auth.isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Security Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-8">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">Please log in or register to access and manage security settings for this app.</p>
          <div className="flex justify-center gap-4">
            <a
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Log In
            </a>
            <a
              href="/register"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Register
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          Security Settings
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* App Permissions */}
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            App Permissions
          </h3>
          <div className="space-y-4">
            {[
              { type: 'basic_profile', label: 'Access Basic Profile' },
              { type: 'preferences', label: 'Access User Preferences' },
              { type: 'file_system', label: 'Access File System' }
            ].map(({ type, label }) => {
              const permission = permissions.find(p => p.permission_type === type);
              return (
                <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{label}</h4>
                    <p className="text-sm text-gray-600">
                      Allow this app to {type === 'basic_profile' 
                        ? 'access your basic profile information'
                        : type === 'preferences'
                        ? 'read and modify your preferences'
                        : 'access your files and documents'}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePermissionChange(type, !permission?.is_granted)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      permission?.is_granted ? 'bg-blue-600' : 'bg-gray-200'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        permission?.is_granted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Shared Memory Access */}
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Shared Memory Access
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <h4 className="font-medium">Data Access Level</h4>
              <p className="text-sm text-gray-600">
                Control how this app can interact with your shared data
              </p>
            </div>
            <div className="space-y-2">
              {['read', 'write', 'read_write'].map((accessType) => (
                <button
                  key={accessType}
                  onClick={() => handleMemoryAccessChange(accessType)}
                  disabled={saving}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border ${
                    memoryAccess?.access_type === accessType
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="capitalize">
                    {accessType.replace('_', ' ')} Access
                  </span>
                  {memoryAccess?.access_type === accessType && (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sandbox Settings */}
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            Sandbox Settings
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Strict Isolation</h4>
                <p className="text-sm text-gray-600">
                  Run this app in a secure sandbox with limited system access
                </p>
              </div>
              <div className="h-6 w-11 bg-blue-600 rounded-full relative">
                <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Memory Limit</span>
                <span className="font-medium">256 MB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Storage Limit</span>
                <span className="font-medium">100 MB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">CPU Usage</span>
                <span className="font-medium">50%</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}