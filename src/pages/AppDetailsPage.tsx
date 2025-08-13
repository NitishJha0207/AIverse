import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Star, Shield, ExternalLink, AlertCircle, Download, Check, Settings, Store, Server } from 'lucide-react';
import { AppListing } from '../types';
import { getAppListingById, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppInstallation } from '../hooks/useAppInstallation';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getCachedData, cacheData } from '../lib/cache';
import { LazyImage } from '../components/LazyImage';
import { FixedSizeList as List } from 'react-window';
import { useEnterprise } from '../context/EnterpriseContext';
import { AppContainerManager } from '../components/enterprise/AppContainerManager';

// Lazy load modals
const PermissionModal = React.lazy(() => import('../components/PermissionModal'));

// Cache key for app details
const APP_CACHE_KEY = 'app_details';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Loading skeleton component
const AppDetailsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  </div>
);

// Review item renderer for virtual list
const ReviewItem = React.memo(({ index, style, data }: any) => {
  const review = data[index];
  return (
    <div style={style} className="border-b border-gray-100 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="font-medium">{review.userName}</span>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(review.date).toLocaleDateString()}
        </span>
      </div>
      <p className="mt-2 text-gray-700">{review.comment}</p>
    </div>
  );
});

function AppDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { installApp, uninstallApp, getStatus } = useAppInstallation();
  const { hasAccess } = useEnterprise();
  const [app, setApp] = useState<AppListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState([]);
  const [isInstalled, setIsInstalled] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showContainer, setShowContainer] = useState(false);

  // Memoize app data fetching
  const fetchAppData = useCallback(async () => {
    if (!id) {
      setError('App ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cachedData = getCachedData(`${APP_CACHE_KEY}_${id}`);
      if (cachedData) {
        setApp(cachedData);
        setLoading(false);
        
        // Refresh cache in background
        getAppListingById(id).then(freshData => {
          if (freshData) {
            cacheData(`${APP_CACHE_KEY}_${id}`, freshData, CACHE_DURATION);
            setApp(freshData);
          }
        });
        
        return;
      }

      // Use Promise.all for parallel requests
      const [appData, installStatus] = await Promise.all([
        getAppListingById(id),
        auth.isAuthenticated ? getStatus(id) : null
      ]);
      
      if (!appData) {
        setError('App not found');
        setLoading(false);
        return;
      }

      // Cache the data
      cacheData(`${APP_CACHE_KEY}_${id}`, appData, CACHE_DURATION);
      setApp(appData);

      // Check installation status
      setIsInstalled(installStatus?.status === 'installed');

      if (installStatus?.status === 'installed' && installStatus?.permissions) {
        setCurrentPermissions(installStatus.permissions);
      }
    } catch (err) {
      console.error('Error fetching app details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load app details');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [id, auth.isAuthenticated, getStatus]);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  const handleRetry = () => {
    setRetrying(true);
    fetchAppData();
  };

  // Memoize computed values
  const appRating = useMemo(() => {
    if (!app) return null;
    return {
      stars: Math.round(app.rating),
      formattedCount: app.reviews_count?.toLocaleString() || 0
    };
  }, [app]);

  const handleInstallClick = async () => {
    if (!auth.isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnTo: `/app/${id}`,
          message: 'Please log in to install apps.'
        }
      });
      return;
    }

    if (!app) return;

    // If the app has a store URL, redirect to the original store
    if (app.store_url && app.store_url !== '#') {
      window.open(app.store_url, '_blank');
      return;
    }

    setShowPermissions(true);
  };

  const handlePermissionsGranted = async (permissions) => {
    if (!app) return;
    
    try {
      setInstalling(true);
      setError(null);
      await installApp(app);
      setIsInstalled(true);
      setCurrentPermissions(permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install app');
    } finally {
      setInstalling(false);
      setShowPermissions(false);
    }
  };

  const handleUninstall = async () => {
    if (!app) return;
    
    try {
      await uninstallApp(app.id);
      setIsInstalled(false);
      setCurrentPermissions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall app');
    }
  };

  const handleContainerClick = () => {
    if (!auth.isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnTo: `/app/${id}`,
          message: 'Please log in to manage app containers.'
        }
      });
      return;
    }
    
    if (!hasAccess) {
      navigate('/enterprise/dashboard');
      return;
    }
    
    setShowContainer(true);
  };

  if (loading) {
    return <AppDetailsSkeleton />;
  }

  if (error || !app) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading App</h2>
          <p className="text-gray-600 mb-4">{error || 'App not found'}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {retrying ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : null}
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* App Header */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-6">
              <img
                src={app.icon_url}
                alt={`${app.name} icon`}
                className="w-24 h-24 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-600">{app.developer_name}</span>
                  {app.original_store && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                      <Store className="w-3 h-3" />
                      {app.original_store}
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= appRating?.stars
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-gray-600">
                    ({appRating?.formattedCount})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {app.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* App Description */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">About this app</h2>
            <p className="text-gray-700 whitespace-pre-line">{app.description}</p>
          </div>

          {/* App Features */}
          {app.features && app.features.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Features</h2>
              <ul className="space-y-2">
                {app.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Screenshots */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Screenshots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {app.screenshots.map((screenshot, index) => (
                  <div key={index} className="rounded-lg overflow-hidden">
                    <LazyImage
                      src={screenshot}
                      alt={`${app.name} screenshot ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {app.reviews && app.reviews.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Reviews</h2>
              <div className="space-y-4">
                {app.reviews.slice(0, 5).map((review, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium">{review.userName}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install Button */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-4">
                {app.price > 0 ? `$${app.price.toFixed(2)}` : 'Free'}
              </div>
              {isInstalled ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                    <Check className="w-4 h-4" />
                    <span>Installed</span>
                  </div>
                  <button
                    onClick={handleUninstall}
                    className="w-full px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Uninstall
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {installing ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Installing...</span>
                    </>
                  ) : app.store_url && app.store_url !== '#' ? (
                    <>
                      <Store className="w-5 h-5" />
                      <span>Get on {app.original_store}</span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Install</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* App Info */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Version</span>
                <span className="font-medium">{app.version || '1.0.0'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Category</span>
                <span className="font-medium">{app.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Updated</span>
                <span className="font-medium">
                  {new Date(app.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Enterprise Container Management */}
          {hasAccess && auth.isAuthenticated && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                Enterprise Container
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage this app's container with advanced isolation and security controls.
              </p>
              <button
                onClick={handleContainerClick}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Server className="w-5 h-5" />
                Manage Container
              </button>
            </div>
          )}

          {/* Developer Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-4">Developer</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Name</span>
                <span className="font-medium">{app.developer_name}</span>
              </div>
              {app.store_url && app.store_url !== '#' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Store</span>
                  <a
                    href={app.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {app.original_store}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissions && (
        <Suspense fallback={<LoadingSpinner size="large" />}>
          <PermissionModal
            app={app}
            onClose={() => setShowPermissions(false)}
            onGrantPermissions={handlePermissionsGranted}
          />
        </Suspense>
      )}

      {/* Container Management Modal */}
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
    </div>
  );
}

export default function AppDetailsPage() {
  return (
    <ErrorBoundary>
      <AppDetailsContent />
    </ErrorBoundary>
  );
}