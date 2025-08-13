import React from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { SharedMemoryProvider } from './context/SharedMemoryContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HomeNavbar } from './components/HomeNavbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Suspense, lazy, useEffect, useState } from 'react';
import { initPerformanceMonitoring } from './lib/performance';
import { InstallPrompt } from './components/InstallPrompt';
import { AppUpdatePrompt } from './components/AppUpdatePrompt';
import { clearAllCaches, detectFaultedState, recoverFromFaultedState } from './lib/cache';
import { EnterpriseProvider } from './context/EnterpriseContext';

// Initialize performance monitoring
initPerformanceMonitoring();

// Lazy load pages with error boundaries
const ClassifiedsPage = lazy(() => import('./pages/ClassifiedsPage').catch(() => {
  console.error('Failed to load ClassifiedsPage');
  return { default: () => <div>Failed to load page</div> };
}));
const HomePage = lazy(() => import('./pages/HomePage').catch(() => {
  console.error('Failed to load HomePage');
  return { default: () => <div>Failed to load page</div> };
}));
const AppDetailsPage = lazy(() => import('./pages/AppDetailsPage').catch(() => {
  console.error('Failed to load AppDetailsPage');
  return { default: () => <div>Failed to load page</div> };
}));
const LoginPage = lazy(() => import('./pages/LoginPage').catch(() => {
  console.error('Failed to load LoginPage');
  return { default: () => <div>Failed to load page</div> };
}));
const RegisterPage = lazy(() => import('./pages/RegisterPage').catch(() => {
  console.error('Failed to load RegisterPage');
  return { default: () => <div>Failed to load page</div> };
}));
const DeveloperRegistrationPage = lazy(() => import('./pages/DeveloperRegistrationPage').catch(() => {
  console.error('Failed to load DeveloperRegistrationPage');
  return { default: () => <div>Failed to load page</div> };
}));
const DeveloperConsolePage = lazy(() => import('./pages/DeveloperConsolePage').catch(() => {
  console.error('Failed to load DeveloperConsolePage');
  return { default: () => <div>Failed to load page</div> };
}));
const PublishAppPage = lazy(() => import('./pages/PublishAppPage').catch(() => {
  console.error('Failed to load PublishAppPage');
  return { default: () => <div>Failed to load page</div> };
}));
const AppMetricsPage = lazy(() => import('./pages/AppMetricsPage').catch(() => {
  console.error('Failed to load AppMetricsPage');
  return { default: () => <div>Failed to load page</div> };
}));
const AdminPortalPage = lazy(() => import('./pages/AdminPortalPage').catch(() => {
  console.error('Failed to load AdminPortalPage');
  return { default: () => <div>Failed to load page</div> };
}));
const TutorialsPage = lazy(() => import('./pages/TutorialsPage').catch(() => {
  console.error('Failed to load TutorialsPage');
  return { default: () => <div>Failed to load page</div> };
}));
const LaunchesPage = lazy(() => import('./pages/LaunchesPage').catch(() => {
  console.error('Failed to load LaunchesPage');
  return { default: () => <div>Failed to load page</div> };
}));
const UpdatesPage = lazy(() => import('./pages/UpdatesPage').catch(() => {
  console.error('Failed to load UpdatesPage');
  return { default: () => <div>Failed to load page</div> };
}));
const AboutPage = lazy(() => import('./pages/AboutPage').catch(() => {
  console.error('Failed to load AboutPage');
  return { default: () => <div>Failed to load page</div> };
}));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').catch(() => {
  console.error('Failed to load FeaturesPage');
  return { default: () => <div>Failed to load page</div> };
}));

// Enterprise Pages
const EnterpriseLoginPage = lazy(() => import('./pages/enterprise/EnterpriseLoginPage').catch(() => {
  console.error('Failed to load EnterpriseLoginPage');
  return { default: () => <div>Failed to load page</div> };
}));
const EnterpriseDashboardPage = lazy(() => import('./pages/enterprise/EnterpriseDashboardPage').catch(() => {
  console.error('Failed to load EnterpriseDashboardPage');
  return { default: () => <div>Failed to load page</div> };
}));
const EnterpriseSetupPage = lazy(() => import('./pages/enterprise/EnterpriseSetupPage').catch(() => {
  console.error('Failed to load EnterpriseSetupPage');
  return { default: () => <div>Failed to load page</div> };
}));
const AdminDashboardPage = lazy(() => import('./pages/enterprise/AdminDashboardPage').catch(() => {
  console.error('Failed to load AdminDashboardPage');
  return { default: () => <div>Failed to load page</div> };
}));
const TeamManagementPage = lazy(() => import('./pages/enterprise/TeamManagementPage').catch(() => {
  console.error('Failed to load TeamManagementPage');
  return { default: () => <div>Failed to load page</div> };
}));
const UserInvitePage = lazy(() => import('./pages/enterprise/UserInvitePage').catch(() => {
  console.error('Failed to load UserInvitePage');
  return { default: () => <div>Failed to load page</div> };
}));
const EnterpriseSettingsPage = lazy(() => import('./pages/enterprise/EnterpriseSettingsPage').catch(() => {
  console.error('Failed to load EnterpriseSettingsPage');
  return { default: () => <div>Failed to load page</div> };
}));
const LicenseManagementPage = lazy(() => import('./pages/enterprise/LicenseManagementPage').catch(() => {
  console.error('Failed to load LicenseManagementPage');
  return { default: () => <div>Failed to load page</div> };
}));
const SsoConfigPage = lazy(() => import('./pages/enterprise/SsoConfigPage').catch(() => {
  console.error('Failed to load SsoConfigPage');
  return { default: () => <div>Failed to load page</div> };
}));
const DlpConfigPage = lazy(() => import('./pages/enterprise/DlpConfigPage').catch(() => {
  console.error('Failed to load DlpConfigPage');
  return { default: () => <div>Failed to load page</div> };
}));
const AuditLogsPage = lazy(() => import('./pages/enterprise/AuditLogsPage').catch(() => {
  console.error('Failed to load AuditLogsPage');
  return { default: () => <div>Failed to load page</div> };
}));
const ResourceMonitoringPage = lazy(() => import('./pages/enterprise/ResourceMonitoringPage').catch(() => {
  console.error('Failed to load ResourceMonitoringPage');
  return { default: () => <div>Failed to load page</div> };
}));
const SupportTicketsPage = lazy(() => import('./pages/enterprise/SupportTicketsPage').catch(() => {
  console.error('Failed to load SupportTicketsPage');
  return { default: () => <div>Failed to load page</div> };
}));

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Track current path for navbar selection
    const handleLocationChange = () => {
      setCurrentPath(location.pathname);
    };

    // Update current path when location changes
    setCurrentPath(location.pathname);

    // Check for faulted state and recover if needed
    if (detectFaultedState()) {
      recoverFromFaultedState();
      clearAllCaches();
      window.location.reload();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh data when page becomes visible
        window.location.reload();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page reload
    const handleBeforeUnload = () => {
      // Clear any stale cache before reload
      clearAllCaches();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location]);

  const handleAppUpdate = () => {
    // Clear caches and reload
    clearAllCaches();
    window.location.reload();
  };

  // Determine if we should show the home navbar or the app store navbar
  const isHomeSite = currentPath === '/' || 
                     currentPath === '/home' || 
                     currentPath === '/about' || 
                     currentPath === '/features' || 
                     currentPath === '/launches' || 
                     currentPath === '/updates' || 
                     currentPath === '/tutorials';

  // Check if we're on an enterprise page
  const isEnterprisePage = currentPath.startsWith('/enterprise');

  if (!isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📶</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">You're offline</h2>
          <p className="text-gray-600 mb-6">
            The AI Verse requires an internet connection to function properly. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SharedMemoryProvider>
          <EnterpriseProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              {isHomeSite ? <HomeNavbar /> : <Navbar />}
              <main className="flex-grow">
                <Suspense
                  fallback={
                    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                      <LoadingSpinner size="large" message="Loading page..." />
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/store" element={<ClassifiedsPage />} />
                    <Route path="/app/:id" element={<AppDetailsPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/developer/register" element={<DeveloperRegistrationPage />} />
                    <Route path="/developer/console" element={<DeveloperConsolePage />} />
                    <Route path="/developer/publish" element={<PublishAppPage />} />
                    <Route path="/developer/apps/:id" element={<AppMetricsPage />} />
                    <Route path="/admin" element={<AdminPortalPage />} />
                    <Route path="/tutorials" element={<TutorialsPage />} />
                    <Route path="/launches" element={<LaunchesPage />} />
                    <Route path="/updates" element={<UpdatesPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/features" element={<FeaturesPage />} />
                    
                    {/* Enterprise Routes */}
                    <Route path="/enterprise/login" element={<EnterpriseLoginPage />} />
                    <Route path="/enterprise/dashboard" element={<EnterpriseDashboardPage />} />
                    <Route path="/enterprise/setup" element={<EnterpriseSetupPage />} />
                    <Route path="/enterprise/admin" element={<AdminDashboardPage />} />
                    <Route path="/enterprise/teams/:id" element={<TeamManagementPage />} />
                    <Route path="/enterprise/users/invite" element={<UserInvitePage />} />
                    <Route path="/enterprise/settings" element={<EnterpriseSettingsPage />} />
                    <Route path="/enterprise/license" element={<LicenseManagementPage />} />
                    <Route path="/enterprise/sso" element={<SsoConfigPage />} />
                    <Route path="/enterprise/dlp" element={<DlpConfigPage />} />
                    <Route path="/enterprise/audit" element={<AuditLogsPage />} />
                    <Route path="/enterprise/monitoring" element={<ResourceMonitoringPage />} />
                    <Route path="/enterprise/support" element={<SupportTicketsPage />} />
                    
                    {/* Catch-all route for 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
              <InstallPrompt />
              <AppUpdatePrompt onUpdate={handleAppUpdate} />
            </div>
          </EnterpriseProvider>
        </SharedMemoryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;