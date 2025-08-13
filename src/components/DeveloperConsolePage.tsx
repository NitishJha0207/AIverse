import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Package,
  Settings,
  AlertCircle,
  RefreshCcw,
  Eye,
  Trash2,
  Edit,
  List
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DeveloperProfile, AppSubmission, AppMetrics } from '../types';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LogViewer } from './LogViewer';

export function DeveloperConsolePage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [apps, setApps] = useState<AppSubmission[]>([]);
  const [metrics, setMetrics] = useState<Record<string, AppMetrics>>({});
  const [retrying, setRetrying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingApp, setDeletingApp] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const fetchDeveloperData = async () => {
    try {
      if (!auth.isAuthenticated || !auth.user?.id) {
        navigate('/login', { 
          state: { 
            returnTo: '/developer/console',
            message: 'Please log in to access the developer console.' 
          } 
        });
        return;
      }

      setLoading(true);
      setError(null);

      // Fetch developer profile
      const { data: profileData, error: profileError } = await supabase
        .from('developer_profiles')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile not found, redirect to registration
          navigate('/developer/register');
          return;
        }
        throw new Error(profileError.message);
      }

      if (!profileData) {
        navigate('/developer/register');
        return;
      }

      setProfile(profileData);

      // Fetch developer's apps with timeout handling
      const fetchAppsPromise = supabase
        .from('app_submissions')
        .select('*')
        .eq('developer_id', profileData.id)
        .order('created_at', { ascending: false });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetching apps timed out')), 10000)
      );
      
      const { data: appsData, error: appsError } = await Promise.race([
        fetchAppsPromise, 
        timeoutPromise
      ]) as any;

      if (appsError) throw new Error(appsError.message);
      setApps(appsData || []);

      // Fetch metrics for each app
      if (appsData && appsData.length > 0) {
        const metricsPromises = appsData.map(app => 
          supabase
            .from('app_metrics')
            .select('*')
            .eq('app_id', app.id)
            .maybeSingle()
            .then(({ data }) => data || {
              app_id: app.id,
              downloads: 0,
              activeUsers: 0,
              userGrowth: { daily: 0, weekly: 0, monthly: 0 },
              userLoss: { daily: 0, weekly: 0, monthly: 0 }
            })
            .catch(() => ({
              app_id: app.id,
              downloads: 0,
              activeUsers: 0,
              userGrowth: { daily: 0, weekly: 0, monthly: 0 },
              userLoss: { daily: 0, weekly: 0, monthly: 0 }
            }))
        );

        const metricsResults = await Promise.all(metricsPromises);
        const metricsMap: Record<string, AppMetrics> = {};
        
        metricsResults.forEach((result, index) => {
          if (appsData[index]) {
            metricsMap[appsData[index].id] = result;
          }
        });

        setMetrics(metricsMap);
      }
    } catch (err) {
      console.error('Failed to fetch developer data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load developer console');
    } finally {
      setLoading(false);
      setRetrying(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeveloperData();
  }, [auth.isAuthenticated, auth.user?.id, navigate]);

  const handleRetry = () => {
    setRetrying(true);
    fetchDeveloperData();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeveloperData();
  };

  const handleDeleteApp = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    
    try {
      setDeletingApp(appId);
      
      // Delete the app submission
      const { error } = await supabase
        .from('app_submissions')
        .delete()
        .eq('id', appId);
      
      if (error) throw error;
      
      // Update the local state
      setApps(apps.filter(app => app.id !== appId));
      
    } catch (err) {
      console.error('Failed to delete app:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete app');
    } finally {
      setDeletingApp(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading developer console..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Console</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCcw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Console</h1>
            <p className="text-gray-600">Manage your AI apps and view performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLogs(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="View Logs"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh data"
            >
              <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/developer/settings"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <Link
              to="/developer/publish"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Publish New App
            </Link>
          </div>
        </div>

        {/* Apps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Total Apps</h3>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{apps.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Total Downloads</h3>
              <Download className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold mt-2">
              {Object.values(metrics).reduce((sum, m) => sum + (m.downloads || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Active Users</h3>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold mt-2">
              {Object.values(metrics).reduce((sum, m) => sum + (m.activeUsers || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Monthly Growth</h3>
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold mt-2">
              {Object.values(metrics).reduce((sum, m) => sum + ((m.userGrowth?.monthly || 0)), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Apps List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Your Apps</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {apps.map(app => {
              const appMetrics = metrics[app.id] || {
                downloads: 0,
                activeUsers: 0,
                userGrowth: { daily: 0, weekly: 0, monthly: 0 },
                userLoss: { daily: 0, weekly: 0, monthly: 0 }
              };
              
              return (
                <div key={app.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <img
                        src={app.icon_url || 'https://via.placeholder.com/48'}
                        alt={`${app.name} icon`}
                        className="w-12 h-12 rounded-lg"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{app.name}</h3>
                        <p className="text-sm text-gray-600">{app.short_description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            app.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : app.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : app.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Last updated: {new Date(app.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {app.status === 'approved' && (
                        <Link
                          to={`/app/${app.id}`}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View App
                        </Link>
                      )}
                      <Link
                        to={`/developer/apps/${app.id}`}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        disabled={deletingApp === app.id}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                      >
                        {deletingApp === app.id ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Downloads</p>
                        <p className="font-medium">{appMetrics.downloads.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Active Users</p>
                        <p className="font-medium">{appMetrics.activeUsers.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Monthly Growth</p>
                        <p className="font-medium">+{appMetrics.userGrowth?.monthly.toLocaleString() || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingDown className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Monthly Loss</p>
                        <p className="font-medium">-{appMetrics.userLoss?.monthly.toLocaleString() || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {apps.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-600">You haven't published any apps yet.</p>
                <Link
                  to="/developer/publish"
                  className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                  Publish Your First App
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLogs && <LogViewer onClose={() => setShowLogs(false)} />}
    </div>
  );
}

export default DeveloperConsolePage;