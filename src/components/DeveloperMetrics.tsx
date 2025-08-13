import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Users, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Activity,
  RefreshCcw
} from 'lucide-react';
import { AppMetrics } from '../types';
import { supabase } from '../lib/supabase';
import { ErrorBoundary } from './ErrorBoundary';

interface DeveloperMetricsProps {
  appId: string;
  onError?: (error: string) => void;
}

function DeveloperMetricsContent({ appId, onError }: DeveloperMetricsProps) {
  const [metrics, setMetrics] = useState<AppMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('app_metrics')
        .select('*')
        .eq('app_id', appId)
        .single();

      if (error) throw error;
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      onError?.(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId, onError]);

  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      if (!mounted) return;
      await fetchMetrics();
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchMetrics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  if (loading && !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-600">No metrics available</div>
      </div>
    );
  }

  const getMetricValue = (type: 'growth' | 'loss') => {
    const data = type === 'growth' ? metrics.userGrowth : metrics.userLoss;
    return data[timeframe];
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="flex items-center gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    timeframe === t
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Download className="w-6 h-6 text-blue-600" />
            <span className="text-sm text-gray-500">Total Downloads</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{metrics.downloads.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-sm">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-green-600">+{(metrics.downloads * 0.1).toFixed(0)}</span>
              <span className="text-gray-500">from last {timeframe}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-6 h-6 text-purple-600" />
            <span className="text-sm text-gray-500">Active Users</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-sm">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-green-600">
                {((metrics.activeUsers / metrics.downloads) * 100).toFixed(1)}%
              </span>
              <span className="text-gray-500">retention rate</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="text-sm text-gray-500">User Growth</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">+{getMetricValue('growth').toLocaleString()}</p>
            <div className="flex items-center gap-1 text-sm">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-green-600">
                {getPercentageChange(
                  getMetricValue('growth'),
                  getMetricValue('growth') * 0.8
                ).toFixed(1)}%
              </span>
              <span className="text-gray-500">from last {timeframe}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown className="w-6 h-6 text-red-600" />
            <span className="text-sm text-gray-500">User Loss</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">-{getMetricValue('loss').toLocaleString()}</p>
            <div className="flex items-center gap-1 text-sm">
              <Activity className="w-4 h-4 text-red-500" />
              <span className="text-red-600">
                {((getMetricValue('loss') / metrics.activeUsers) * 100).toFixed(1)}%
              </span>
              <span className="text-gray-500">churn rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Growth Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Daily Metrics</h4>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">New Users</span>
                  <span className="font-medium">+{metrics.userGrowth.daily.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(metrics.userGrowth.daily / metrics.userGrowth.weekly) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Churned Users</span>
                  <span className="font-medium">-{metrics.userLoss.daily.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(metrics.userLoss.daily / metrics.userLoss.weekly) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Weekly Metrics</h4>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">New Users</span>
                  <span className="font-medium">+{metrics.userGrowth.weekly.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(metrics.userGrowth.weekly / metrics.userGrowth.monthly) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Churned Users</span>
                  <span className="font-medium">-{metrics.userLoss.weekly.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${(metrics.userLoss.weekly / metrics.userLoss.monthly) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Monthly Metrics</h4>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">New Users</span>
                  <span className="font-medium">+{metrics.userGrowth.monthly.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Churned Users</span>
                  <span className="font-medium">-{metrics.userLoss.monthly.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeveloperMetrics(props: DeveloperMetricsProps) {
  return (
    <ErrorBoundary>
      <DeveloperMetricsContent {...props} />
    </ErrorBoundary>
  );
}