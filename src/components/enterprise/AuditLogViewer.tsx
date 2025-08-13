import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  ChevronDown,
  X
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { getAuditLogs } from '../../lib/enterprise';
import { AuditLog } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

interface AuditLogViewerProps {
  onClose?: () => void;
}

export function AuditLogViewer({ onClose }: AuditLogViewerProps) {
  const { organization, users } = useEnterprise();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    start: string | null;
    end: string | null;
  }>({
    start: null,
    end: null
  });
  
  // Filter dropdowns
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [showActionFilter, setShowActionFilter] = useState(false);
  const [showResourceFilter, setShowResourceFilter] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [organization?.id]);

  const fetchLogs = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {};
      
      if (userFilter) {
        filters.userId = userFilter;
      }
      
      if (actionFilter) {
        filters.action = actionFilter;
      }
      
      if (resourceTypeFilter) {
        filters.resourceType = resourceTypeFilter;
      }
      
      if (dateRange.start) {
        filters.startDate = new Date(dateRange.start);
      }
      
      if (dateRange.end) {
        filters.endDate = new Date(dateRange.end);
      }
      
      const auditLogs = await getAuditLogs(organization.id, filters);
      setLogs(auditLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.user?.name || log.user_id,
        log.action,
        log.resource_type,
        log.resource_id || '',
        JSON.stringify(log.details).replace(/,/g, ';')
      ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setUserFilter(null);
    setActionFilter(null);
    setResourceTypeFilter(null);
    setDateRange({ start: null, end: null });
    setSearchQuery('');
  };

  // Extract unique values for filters
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));
  const uniqueResourceTypes = Array.from(new Set(logs.map(log => log.resource_type)));

  // Filter logs based on search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      (log.user?.name?.toLowerCase().includes(searchLower) || false) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Audit Logs
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <button
              onClick={() => {
                setShowUserFilter(!showUserFilter);
                setShowActionFilter(false);
                setShowResourceFilter(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <User className="w-4 h-4 text-gray-500" />
              <span>{userFilter ? users.find(u => u.user_id === userFilter)?.user?.name || 'User' : 'All Users'}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {showUserFilter && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setUserFilter(null);
                      setShowUserFilter(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                  >
                    All Users
                  </button>
                  {users.map(user => (
                    <button
                      key={user.user_id}
                      onClick={() => {
                        setUserFilter(user.user_id);
                        setShowUserFilter(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                    >
                      {user.user?.name || user.user?.email || 'Unknown User'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => {
                setShowActionFilter(!showActionFilter);
                setShowUserFilter(false);
                setShowResourceFilter(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>{actionFilter || 'All Actions'}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {showActionFilter && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setActionFilter(null);
                      setShowActionFilter(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                  >
                    All Actions
                  </button>
                  {uniqueActions.map(action => (
                    <button
                      key={action}
                      onClick={() => {
                        setActionFilter(action);
                        setShowActionFilter(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => {
                setShowResourceFilter(!showResourceFilter);
                setShowUserFilter(false);
                setShowActionFilter(false);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              <span>{resourceTypeFilter || 'All Resources'}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {showResourceFilter && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setResourceTypeFilter(null);
                      setShowResourceFilter(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                  >
                    All Resources
                  </button>
                  {uniqueResourceTypes.map(resourceType => (
                    <button
                      key={resourceType}
                      onClick={() => {
                        setResourceTypeFilter(resourceType);
                        setShowResourceFilter(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                    >
                      {resourceType}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Refresh logs"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Download logs"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          {(userFilter || actionFilter || resourceTypeFilter || dateRange.start || dateRange.end || searchQuery) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && !refreshing ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="large" message="Loading audit logs..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit logs found matching your criteria.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
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
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {log.user?.name || log.user_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {log.resource_type}
                    </span>
                    {log.resource_id && (
                      <span className="ml-2 text-xs text-gray-500">
                        {log.resource_id.substring(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {Object.keys(log.details).length > 0 ? (
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded-md text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-gray-400">No details</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}