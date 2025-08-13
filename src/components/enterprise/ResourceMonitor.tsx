import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  AlertCircle, 
  RefreshCw,
  X,
  BarChart3,
  Clock
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../LoadingSpinner';

interface ResourceMetric {
  id: string;
  app_id: string;
  user_id: string;
  event_type: string;
  severity: string;
  details: Record<string, any>;
  created_at: string;
}

interface ResourceMonitorProps {
  onClose?: () => void;
}

export function ResourceMonitor({ onClose }: ResourceMonitorProps) {
  const { organization } = useEnterprise();
  const [metrics, setMetrics] = useState<ResourceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    if (organization) {
      fetchMetrics();
    }
  }, [organization, timeframe]);

  const fetchMetrics = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      // Fetch monitoring events
      const { data, error } = await supabase
        .from('app_monitoring_events')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resource metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  // Group metrics by type for summary
  const metricSummary = metrics.reduce((acc, metric) => {
    const type = metric.event_type;
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        critical: 0,
        error: 0,
        warning: 0,
        info: 0
      };
    }
    
    acc[type].count++;
    acc[type][metric.severity]++;
    
    return acc;
  }, {} as Record<string, { count: number; critical: number; error: number; warning: number; info: number; }>);

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Not Found</h3>
          <p className="text-gray-600">Please set up your organization first.</p>
        </div>
        {onClose && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Resource Monitoring</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="text-gray-700">Time Range:</span>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setTimeframe('1h')}
              className={`px-3 py-1 text-sm ${
                timeframe === '1h' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              1h
            </button>
            <button
              onClick={() => setTimeframe('24h')}
              className={`px-3 py-1 text-sm ${
                timeframe === '24h' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 text-sm ${
                timeframe === '7d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 text-sm ${
                timeframe === '30d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              30d
            </button>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              CPU Usage
            </h3>
            <span className="text-sm text-gray-500">
              {metricSummary['resource_limit']?.count || 0} events
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Critical</span>
              <span className="font-medium text-red-600">{metricSummary['resource_limit']?.critical || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Warning</span>
              <span className="font-medium text-yellow-600">{metricSummary['resource_limit']?.warning || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-600" />
              Memory Usage
            </h3>
            <span className="text-sm text-gray-500">
              {metricSummary['performance_issue']?.count || 0} events
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Critical</span>
              <span className="font-medium text-red-600">{metricSummary['performance_issue']?.critical || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Warning</span>
              <span className="font-medium text-yellow-600">{metricSummary['performance_issue']?.warning || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Network className="w-5 h-5 text-green-600" />
              Network Activity
            </h3>
            <span className="text-sm text-gray-500">
              {metricSummary['security_violation']?.count || 0} events
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Critical</span>
              <span className="font-medium text-red-600">{metricSummary['security_violation']?.critical || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Warning</span>
              <span className="font-medium text-yellow-600">{metricSummary['security_violation']?.warning || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Events */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Resource Events
            </h3>
            <span className="text-sm text-gray-500">
              {metrics.length} events in selected timeframe
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="medium" message="Loading resource metrics..." />
            </div>
          ) : metrics.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No resource events found in the selected timeframe.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.map((metric) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(metric.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {metric.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        metric.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        metric.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                        metric.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {metric.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {metric.details.resource || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded-md text-xs overflow-x-auto">
                          {JSON.stringify(metric.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {onClose && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}