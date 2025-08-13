import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppListing, AppInstallation, InstallationProgress } from '../types';
import { installApp as installAppUtil, uninstallApp as uninstallAppUtil } from '../lib/installation';
import { supabase } from '../lib/supabase';

// Cache for installation statuses
const installationCache = new Map<string, AppInstallation>();

export function useAppInstallation() {
  const { auth } = useAuth();
  const [installations, setInstallations] = useState<Record<string, AppInstallation>>({});
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, InstallationProgress>>({});
  const mountedRef = useRef(true);
  const progressCallbacksRef = useRef<Record<string, ((progress: InstallationProgress) => void)[]>>({});

  // Load user's installations
  useEffect(() => {
    let mounted = true;

    const loadInstallations = async () => {
      if (!auth.isAuthenticated || !auth.user) return;

      try {
        const { data: installations, error } = await supabase
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
            app:app_listings!app_id(*)
          `)
          .eq('user_id', auth.user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST116') {
            // No installations found - this is normal for new users
            if (mounted) {
              setInstallations({});
            }
            return;
          }
          throw error;
        }
        
        if (!mounted) return;

        const installationsMap: Record<string, AppInstallation> = {};
        if (installations) {
          installationsMap[installations.app_id] = installations;
          installationCache.set(installations.app_id, installations);
        }

        setInstallations(installationsMap);
      } catch (error) {
        console.error('Failed to load installations:', error);
      }
    };

    loadInstallations();

    return () => {
      mounted = false;
    };
  }, [auth.isAuthenticated, auth.user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      progressCallbacksRef.current = {};
    };
  }, []);

  const installApp = useCallback(async (app: AppListing) => {
    if (!auth.isAuthenticated || !auth.user) {
      throw new Error('User not authenticated');
    }

    setInstalling(prev => ({ ...prev, [app.id]: true }));
    setProgress(prev => ({ 
      ...prev, 
      [app.id]: { status: 'pending', progress: 0 } 
    }));

    try {
      const installation = await installAppUtil(app, (progressValue) => {
        if (mountedRef.current) {
          setProgress(prev => ({ 
            ...prev, 
            [app.id]: progressValue 
          }));
          
          progressCallbacksRef.current[app.id]?.forEach(callback => callback(progressValue));
        }
      });

      if (mountedRef.current) {
        setInstallations(prev => ({ ...prev, [app.id]: installation }));
        installationCache.set(app.id, installation);
      }
      return installation;
    } finally {
      if (mountedRef.current) {
        setInstalling(prev => ({ ...prev, [app.id]: false }));
      }
    }
  }, [auth.isAuthenticated, auth.user]);

  const uninstallApp = useCallback(async (appId: string) => {
    if (!auth.isAuthenticated || !auth.user) {
      throw new Error('User not authenticated');
    }

    await uninstallAppUtil(appId);
    if (mountedRef.current) {
      setInstallations(prev => {
        const newInstallations = { ...prev };
        delete newInstallations[appId];
        return newInstallations;
      });
      installationCache.delete(appId);
    }
  }, [auth.isAuthenticated, auth.user]);

  const getStatus = useCallback(async (appId: string) => {
    if (!auth.isAuthenticated || !auth.user) return null;
    
    // Check cache first
    const cached = installationCache.get(appId);
    if (cached) {
      return cached;
    }

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
        app:app_listings!app_id(*)
      `)
      .eq('app_id', appId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (data) {
      installationCache.set(appId, data);
    }
    return data;
  }, [auth.isAuthenticated, auth.user]);

  const subscribeToProgress = useCallback((appId: string, callback: (progress: InstallationProgress) => void) => {
    if (!progressCallbacksRef.current[appId]) {
      progressCallbacksRef.current[appId] = [];
    }
    progressCallbacksRef.current[appId].push(callback);

    return () => {
      progressCallbacksRef.current[appId] = progressCallbacksRef.current[appId]?.filter(cb => cb !== callback) || [];
    };
  }, []);

  // Get installed apps as an array
  const installedApps = Object.values(installations)
    .filter(installation => installation.status === 'installed')
    .map(installation => ({
      id: installation.app_id,
      status: installation.status,
      permissions: installation.permissions || []
    }));

  return {
    installations,
    installing,
    progress,
    installApp,
    uninstallApp,
    getStatus,
    subscribeToProgress,
    installedApps
  };
}