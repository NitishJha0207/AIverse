import { memo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Shield, Download, Check, Loader2, ExternalLink, AlertCircle, Store, Activity, Server } from 'lucide-react';
import type { AppListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppInstallation } from '../hooks/useAppInstallation';
import { SecuritySettings } from './SecuritySettings';
import { LazyImage } from './LazyImage';
import { ExternalAppDialog } from './ExternalAppDialog';
import { AppBehaviorDialog } from './AppBehaviorDialog';
import { AppContainerManager } from './enterprise/AppContainerManager';
import { trackAppBehavior } from '../lib/appTracking';
import { useNavigationStore } from '../lib/navigationStateMachine';
import { useEnterprise } from '../context/EnterpriseContext';

interface AppCardProps {
  app: AppListing;
  viewMode: 'grid' | 'list';
}

function AppCard({ app, viewMode }: AppCardProps) {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { installApp, getStatus, progress } = useAppInstallation();
  const navigationStore = useNavigationStore();
  const { hasAccess } = useEnterprise();
  const [error, setError] = useState<string | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showExternalWarning, setShowExternalWarning] = useState(false);
  const [showBehavior, setShowBehavior] = useState(false);
  const [showContainer, setShowContainer] = useState(false);

  const [installationStatus, setInstallationStatus] = useState<{
    isInstalled: boolean;
    isInstalling: boolean;
    progress: number;
  }>({
    isInstalled: false,
    isInstalling: false,
    progress: 0
  });

  const isExternalApp = app.store_url && app.store_url !== '#';

  const checkStatus = useCallback(async () => {
    if (isExternalApp || !auth.isAuthenticated) return;
    
    try {
      const status = await getStatus(app.id);
      if (!status) return;

      setInstallationStatus({
        isInstalled: status.status === 'installed',
        isInstalling: ['pending', 'downloading', 'installing'].includes(status.status),
        progress: status.progress || 0
      });
    } catch (err) {
      console.error('Failed to check installation status:', err);
    }
  }, [app.id, getStatus, isExternalApp, auth.isAuthenticated]);

  useEffect(() => {
    let mounted = true;
    let statusCheckInterval: number;

    const initializeStatus = async () => {
      if (!mounted) return;
      await checkStatus();
      
      if (installationStatus.isInstalling) {
        statusCheckInterval = window.setInterval(checkStatus, 2000);
      }
    };

    initializeStatus();

    return () => {
      mounted = false;
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [checkStatus, installationStatus.isInstalling]);

  useEffect(() => {
    if (progress[app.id]) {
      setInstallationStatus(prev => ({
        ...prev,
        isInstalling: progress[app.id].status !== 'installed',
        progress: progress[app.id].progress
      }));

      if (progress[app.id].status === 'failed') {
        setError(progress[app.id].error || 'Installation failed');
      }
    }
  }, [app.id, progress]);

  const handleInstall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!auth.isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnTo: `/app/${app.id}`,
          message: 'Please log in to install apps.'
        }
      });
      return;
    }

    if (isExternalApp) {
      try {
        await trackAppBehavior({
          appId: app.id,
          action: 'external_app_click',
          category: 'usage',
          details: {
            store: app.original_store || 'External Store',
            store_url: app.store_url
          }
        });
      } catch (err) {
        console.error('Failed to track external app click:', err);
      }

      navigationStore.startNavigation(
        app.store_url || '#',
        app.id,
        app.name,
        app.original_store || 'External Store'
      );
      setShowExternalWarning(true);
      return;
    }

    try {
      setError(null);
      await trackAppBehavior({
        appId: app.id,
        action: 'installation_started',
        category: 'usage',
        details: {
          version: app.version || '1.0.0'
        }
      }).catch(console.error);
      
      await installApp(app);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to install app';
      setError(errorMessage);
      
      trackAppBehavior({
        appId: app.id,
        action: 'installation_failed',
        category: 'security',
        details: {
          error: errorMessage
        }
      }).catch(console.error);
    }
  };

  const handleSecurityClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSecurity(true);
  };

  const handleBehaviorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowBehavior(true);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!hasAccess) {
      navigate('/enterprise/dashboard');
      return;
    }
    
    setShowContainer(true);
  };

  return (
    <>
      <Link
        to={`/app/${app.id}`}
        className={`block w-full text-left bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
          viewMode === 'list' ? 'p-6' : 'p-4'
        }`}
      >
        <div className="flex items-start gap-4">
          <LazyImage
            src={app.icon_url}
            alt={`${app.name} icon`}
            className="w-16 h-16 rounded-lg object-cover"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {app.name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{app.developer_name}</span>
                  {isExternalApp && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                      <Store className="w-3 h-3" />
                      {app.original_store || 'External Store'}
                    </span>
                  )}
                  {app.is_native && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      Native
                    </span>
                  )}
                </div>
              </div>
              <div>
                {installationStatus.isInstalled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <Check className="w-3 h-3" />
                    Installed
                  </span>
                ) : installationStatus.isInstalling ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-600">
                        {progress[app.id]?.status === 'downloading' ? 'Downloading...' : 
                         progress[app.id]?.status === 'installing' ? 'Installing...' : 
                         'Preparing...'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{ width: `${installationStatus.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isExternalApp ? (
                      <>
                        <Store className="w-4 h-4" />
                        <span>Get on {app.original_store || 'External Store'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {app.price > 0 ? `$${app.price.toFixed(2)}` : 'Free'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(app.rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                ({app.reviews_count?.toLocaleString() || 0})
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {app.short_description}
            </p>

            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {app.tags?.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {app.version && (
                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  v{app.version}
                </span>
              )}
              <button
                onClick={handleSecurityClick}
                className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs hover:bg-blue-100 transition-colors"
              >
                <Shield className="w-3 h-3 inline-block mr-1" />
                Security
              </button>
              <button
                onClick={handleBehaviorClick}
                className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs hover:bg-purple-100 transition-colors"
              >
                <Activity className="w-3 h-3 inline-block mr-1" />
                Tracking
              </button>
              {hasAccess && (
                <button
                  onClick={handleContainerClick}
                  className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs hover:bg-green-100 transition-colors"
                >
                  <Server className="w-3 h-3 inline-block mr-1" />
                  Container
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>

      {showSecurity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <SecuritySettings
              appId={app.id}
              onClose={() => setShowSecurity(false)}
            />
          </div>
        </div>
      )}

      {showExternalWarning && (
        <ExternalAppDialog
          app={app}
          onClose={() => setShowExternalWarning(false)}
        />
      )}

      {showBehavior && (
        <AppBehaviorDialog
          appId={app.id}
          appName={app.name}
          onClose={() => setShowBehavior(false)}
        />
      )}

      {showContainer && auth.isAuthenticated && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <AppContainerManager
              appId={app.id}
              userId={auth.user!.id}
              onClose={() => setShowContainer(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default memo(AppCard);