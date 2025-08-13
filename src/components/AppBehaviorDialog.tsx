import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Activity, Clock, Shield, X, RefreshCw } from 'lucide-react';
import { getAppBehaviorLogs } from '../lib/appTracking';
import { LoadingSpinner } from './LoadingSpinner';

interface AppBehaviorDialogProps {
  appId: string;
  appName: string;
  onClose: () => void;
}

export function AppBehaviorDialog({ appId, appName, onClose }: AppBehaviorDialogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      // Set a timeout for the loading state
      const timeout = setTimeout(() => {
        setLoading(false);
        setError('Loading is taking longer than expected. Please try refreshing.');
      }, 15000); // 15 second timeout
      setLoadingTimeout(timeout);

      const data = await getAppBehaviorLogs(appId, forceRefresh);
      
      // Clear timeout if successful
      if (loadingTimeout) clearTimeout(loadingTimeout);
      
      setLogs(data);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      // Clear timeout if error occurs
      if (loadingTimeout) clearTimeout(loadingTimeout);
      
      setError(err instanceof Error ? err.message : 'Failed to load behavior logs');
      setLoading(false);
      setRefreshing(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchLogs();
    return () => {
      // Clean up timeout on unmount
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [fetchLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs(true); // Force refresh from server
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'performance':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'usage':
        return <Clock className="w-4 h-4 text-green-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (err) {
      return timestamp; // Fallback to raw timestamp if parsing fails
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold">App Behavior Tracking</h2>
            <p className="text-sm text-gray-600">Monitoring {appName} for your security</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h3 className="font-medium text-blue-900 mb-2">About Behavior Tracking</h3>
          <p className="text-sm text-blue-800">
            AIVerse monitors app behavior to ensure your security and privacy. We track:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>• Security-related actions and potential risks</li>
            <li>• Data access patterns and permissions</li>
            <li>• Performance metrics and resource usage</li>
            <li>• App interactions and feature usage</li>
          </ul>
          <p className="mt-2 text-sm text-blue-800">
            This data is only used to protect you and improve app security. You can review all tracked behavior below.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-medium">Recent Activity</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="medium" message="Loading behavior logs..." />
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-center text-gray-600">
              No behavior logs found for this app yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(log.category)}
                      <span className="font-medium">{log.action}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-2">
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Platform:</span>
                        {log.metadata.platform}
                      </div>
                      {log.metadata.userAgent && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Browser:</span>
                          {log.metadata.userAgent.split(') ')[0].split(' (')[1]}
                        </div>
                      )}
                      {log.metadata.url && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Page:</span>
                          {log.metadata.url}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}