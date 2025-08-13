import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Shield, 
  Settings, 
  BarChart3, 
  Package, 
  Server, 
  AlertCircle,
  RefreshCw,
  Plus,
  Briefcase,
  FileText,
  Activity,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Trash2,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Organization } from '../../types';
import { getAllOrganizations, getOrganizationStatus, getOrganizationErrorLogs } from '../../lib/enterprise';

interface OrganizationWithStatus extends Organization {
  status?: {
    status: 'active' | 'operational' | 'faulted' | 'suspended';
    details: Record<string, any>;
  };
  errorLogs?: any[];
}

function AdminDashboardContent() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithStatus[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<OrganizationWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStatus | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOrganizations = async () => {
    try {
      if (!auth.isAuthenticated) {
        navigate('/login', { 
          state: { 
            returnTo: '/enterprise/admin',
            message: 'Please log in to access the admin dashboard.' 
          } 
        });
        return;
      }

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email')
        .eq('user_id', auth.user?.id)
        .single();

      if (adminError || !adminUser) {
        console.error('Admin access check failed:', adminError);
        navigate('/enterprise/dashboard', { replace: true });
        return;
      }

      setLoading(true);
      setError(null);

      // Fetch all organizations
      const orgs = await getAllOrganizations();
      
      // Fetch status for each organization
      const orgsWithStatus = await Promise.all(
        orgs.map(async (org) => {
          try {
            const status = await getOrganizationStatus(org.id);
            return { ...org, status };
          } catch (err) {
            console.error(`Failed to fetch status for org ${org.id}:`, err);
            return org;
          }
        })
      );

      setOrganizations(orgsWithStatus);
      setFilteredOrgs(orgsWithStatus);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [auth.isAuthenticated, auth.user?.id, navigate]);

  // Filter organizations based on search and status
  useEffect(() => {
    let filtered = [...organizations];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(org => 
        org.name.toLowerCase().includes(query) || 
        org.domain?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(org => org.status?.status === statusFilter);
    }
    
    setFilteredOrgs(filtered);
  }, [searchQuery, statusFilter, organizations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrganizations();
  };

  const handleViewDetails = async (org: OrganizationWithStatus) => {
    try {
      setSelectedOrg(org);
      setLoadingDetails(true);
      
      // Fetch error logs for the organization
      const logs = await getOrganizationErrorLogs(org.id, {
        resolved: false,
        limit: 10
      });
      
      setSelectedOrg(prev => prev ? { ...prev, errorLogs: logs } : null);
    } catch (err) {
      console.error('Failed to fetch organization details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrganizations(organizations.filter(org => org.id !== id));
      if (selectedOrg?.id === id) {
        setSelectedOrg(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'operational': return 'bg-yellow-100 text-yellow-800';
      case 'faulted': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'operational': return <AlertTriangle className="w-4 h-4" />;
      case 'faulted': return <AlertCircle className="w-4 h-4" />;
      case 'suspended': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading enterprise admin dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Admin Dashboard</h1>
            <p className="text-gray-600">Manage all enterprise organizations</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Organizations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Organizations</h2>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {organizations.length} total
                  </span>
                </div>
                
                {/* Search and filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search organizations..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusFilter(!showStatusFilter)}
                      className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span>{statusFilter ? `Status: ${statusFilter}` : 'Filter by status'}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showStatusFilter ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showStatusFilter && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setStatusFilter(null);
                              setShowStatusFilter(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                          >
                            All Statuses
                          </button>
                          {['active', 'operational', 'faulted', 'suspended'].map(status => (
                            <button
                              key={status}
                              onClick={() => {
                                setStatusFilter(status);
                                setShowStatusFilter(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center gap-2"
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                status === 'active' ? 'bg-green-500' :
                                status === 'operational' ? 'bg-yellow-500' :
                                status === 'faulted' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`}></span>
                              <span className="capitalize">{status}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {filteredOrgs.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No organizations found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredOrgs.map(org => (
                      <button
                        key={org.id}
                        onClick={() => handleViewDetails(org)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedOrg?.id === org.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{org.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getStatusColor(org.status?.status)}`}>
                            {getStatusIcon(org.status?.status)}
                            <span className="capitalize">{org.status?.status || 'unknown'}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{org.domain}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>Created: {new Date(org.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Organization Details */}
          <div className="lg:col-span-2">
            {selectedOrg ? (
              <div className="space-y-6">
                {/* Organization Header */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedOrg.name}</h2>
                        <p className="text-gray-600">{selectedOrg.domain}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getStatusColor(selectedOrg.status?.status)}`}>
                            {getStatusIcon(selectedOrg.status?.status)}
                            <span className="capitalize">{selectedOrg.status?.status || 'unknown'}</span>
                          </span>
                          <span className="text-sm text-gray-500">
                            ID: {selectedOrg.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteOrganization(selectedOrg.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete organization"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Organization Status */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Status Details
                  </h3>
                  
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="medium" message="Loading details..." />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">License Status</h4>
                        <p className="font-medium flex items-center gap-1">
                          {selectedOrg.status?.details.license_active ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Active
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Inactive
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">License Tier</h4>
                        <p className="font-medium">
                          {selectedOrg.license?.tier === 'enterprise_standard' ? 'Enterprise General' : 
                           selectedOrg.license?.tier === 'enterprise_premium' ? 'Enterprise Premium' : 
                           'Enterprise Advanced'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Users</h4>
                        <p className="font-medium">
                          {selectedOrg.license?.current_users || 0} / {selectedOrg.license?.max_users || 0}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Error Count (24h)</h4>
                        <p className="font-medium">
                          {selectedOrg.status?.details.error_count > 0 ? (
                            <span className="text-red-600">{selectedOrg.status?.details.error_count} errors</span>
                          ) : (
                            <span className="text-green-600">No errors</span>
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Resource Issues (24h)</h4>
                        <p className="font-medium">
                          {selectedOrg.status?.details.resource_issues > 0 ? (
                            <span className="text-red-600">{selectedOrg.status?.details.resource_issues} issues</span>
                          ) : (
                            <span className="text-green-600">No issues</span>
                          )}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">License Expires</h4>
                        <p className="font-medium">
                          {selectedOrg.license?.expires_at ? new Date(selectedOrg.license.expires_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Logs */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Error Logs
                  </h3>
                  
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="medium" message="Loading error logs..." />
                    </div>
                  ) : selectedOrg.errorLogs && selectedOrg.errorLogs.length > 0 ? (
                    <div className="space-y-4">
                      {selectedOrg.errorLogs.map((log) => (
                        <div key={log.id} className="p-4 bg-red-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="font-medium">{log.message}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Component:</span> {log.component || 'Unknown'}
                          </div>
                          {log.user && (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">User:</span> {log.user.name || log.user.email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No error logs found for this organization
                    </div>
                  )}
                </div>

                {/* Organization Details */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Organization Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Admin User</h4>
                      <p className="font-medium">
                        {selectedOrg.admin_user_id ? (
                          <span className="text-blue-600">{selectedOrg.admin_user_id.substring(0, 8)}...</span>
                        ) : (
                          'None'
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">SSO Status</h4>
                      <p className="font-medium">
                        {selectedOrg.sso_enabled ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Enabled ({selectedOrg.sso_provider})
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Disabled
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Created At</h4>
                      <p className="font-medium">
                        {new Date(selectedOrg.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
                      <p className="font-medium">
                        {new Date(selectedOrg.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* License Features */}
                {selectedOrg.license && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      License Features
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedOrg.license.features) && selectedOrg.license.features.map((feature, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {feature.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Organization</h3>
                <p className="text-gray-500">
                  Select an organization from the list to view detailed information
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  );
}