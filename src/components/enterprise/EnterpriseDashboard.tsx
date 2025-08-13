import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  UserPlus,
  Briefcase,
  FileText,
  Activity,
  MessageSquare,
  Lock,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../LoadingSpinner';
import { LicenseTier } from '../../types';
import { LicenseManager } from './LicenseManager';
import { SsoConfigManager } from './SsoConfigManager';
import { DlpRulesManager } from './DlpRulesManager';
import { AuditLogViewer } from './AuditLogViewer';
import { ResourceMonitor } from './ResourceMonitor';
import { SupportTicketManager } from './SupportTicketManager';
import { getOrganizationStatus, getOrganizationErrorLogs } from '../../lib/enterprise';

export function EnterpriseDashboard() {
  const { 
    organization, 
    license, 
    users, 
    teams, 
    loading, 
    error, 
    hasAccess, 
    isAdmin,
    refreshOrganization,
    refreshUsers,
    refreshTeams
  } = useEnterprise();
  const { auth } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [orgStatus, setOrgStatus] = useState<{
    status: 'active' | 'operational' | 'faulted' | 'suspended';
    details: Record<string, any>;
  } | null>(null);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Modal states
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [showDlpModal, setShowDlpModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Fetch organization status and error logs
  useEffect(() => {
    const fetchOrgStatus = async () => {
      if (!organization) return;
      
      try {
        setLoadingStatus(true);
        const status = await getOrganizationStatus(organization.id);
        setOrgStatus(status);
        
        // Get recent error logs
        const logs = await getOrganizationErrorLogs(organization.id, {
          resolved: false,
          limit: 5
        });
        setErrorLogs(logs);
      } catch (err) {
        console.error('Failed to fetch organization status:', err);
      } finally {
        setLoadingStatus(false);
      }
    };
    
    fetchOrgStatus();
  }, [organization]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshOrganization(),
      refreshUsers(),
      refreshTeams()
    ]);
    
    // Also refresh status and logs
    if (organization) {
      try {
        const status = await getOrganizationStatus(organization.id);
        setOrgStatus(status);
        
        const logs = await getOrganizationErrorLogs(organization.id, {
          resolved: false,
          limit: 5
        });
        setErrorLogs(logs);
      } catch (err) {
        console.error('Failed to refresh status:', err);
      }
    }
    
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'operational': return 'bg-yellow-100 text-yellow-800';
      case 'faulted': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'operational': return <AlertTriangle className="w-4 h-4" />;
      case 'faulted': return <AlertCircle className="w-4 h-4" />;
      case 'suspended': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading enterprise dashboard..." />
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
            onClick={refreshOrganization}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <Building2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Organization Found</h2>
          <p className="text-gray-600 mb-6">
            You're not part of any organization yet. Create one to access enterprise features.
          </p>
          <Link
            to="/enterprise/setup"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Building2 className="w-5 h-5" />
            Create Organization
          </Link>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Access Required</h2>
          <p className="text-gray-600 mb-6">
            Your organization doesn't have an active enterprise license. Please contact your administrator.
          </p>
          {isAdmin && (
            <Link
              to="/enterprise/license"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upgrade License
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Dashboard</h1>
            <p className="text-gray-600">{organization.name}</p>
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
            {isAdmin && (
              <Link
                to="/enterprise/settings"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>

        {/* Organization Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Organization Status
            </h2>
            <div className="flex items-center gap-2">
              {loadingStatus ? (
                <LoadingSpinner size="small" />
              ) : (
                orgStatus && (
                  <span className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${getStatusColor(orgStatus.status)}`}>
                    {getStatusIcon(orgStatus.status)}
                    <span className="capitalize">{orgStatus.status}</span>
                  </span>
                )
              )}
            </div>
          </div>
          
          {orgStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">License Status</h3>
                <p className="font-medium flex items-center gap-1">
                  {orgStatus.details.license_active ? (
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
                <h3 className="text-sm font-medium text-gray-500">Error Count (24h)</h3>
                <p className="font-medium">
                  {orgStatus.details.error_count > 0 ? (
                    <span className="text-red-600">{orgStatus.details.error_count} errors</span>
                  ) : (
                    <span className="text-green-600">No errors</span>
                  )}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Resource Issues (24h)</h3>
                <p className="font-medium">
                  {orgStatus.details.resource_issues > 0 ? (
                    <span className="text-red-600">{orgStatus.details.resource_issues} issues</span>
                  ) : (
                    <span className="text-green-600">No issues</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* License Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              License Information
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowLicenseModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Manage License
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">License Tier</h3>
              <p className="font-medium">
                {license?.tier === LicenseTier.ENTERPRISE_STANDARD ? 'Enterprise General' : 
                 license?.tier === LicenseTier.ENTERPRISE_PREMIUM ? 'Enterprise Premium' : 
                 'Enterprise Advanced'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Users</h3>
              <p className="font-medium">{license?.current_users || 0} / {license?.max_users || 0}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Expires</h3>
              <p className="font-medium">
                {license?.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          
          {license && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Features</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(license.features) && license.features.map((feature, index) => (
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

        {/* Error Logs */}
        {errorLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Recent Error Logs
              </h2>
              <button
                onClick={() => setShowAuditModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View All Logs
              </button>
            </div>
            
            <div className="space-y-4">
              {errorLogs.map((log) => (
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
          </div>
        )}

        {/* Enterprise Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowSsoModal(true)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium">SSO Integration</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Configure single sign-on with Azure AD, Google, or Okta for seamless authentication.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className={`px-2 py-1 text-xs rounded-full ${
                organization.sso_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {organization.sso_enabled ? 'Configured' : 'Not Configured'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSsoModal(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Configure
              </button>
            </div>
          </div>
          
          <div 
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowDlpModal(true)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-medium">Data Loss Prevention</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Configure DLP rules to protect sensitive information from being shared outside your organization.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className={`px-2 py-1 text-xs rounded-full ${
                organization.settings?.compliance_settings?.dlp_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {organization.settings?.compliance_settings?.dlp_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDlpModal(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Configure
              </button>
            </div>
          </div>
          
          <div 
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowAuditModal(true)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium">Audit Logging</h3>
            </div>
            <p className="text-gray-600 text-sm">
              View detailed audit logs of all actions performed within your organization.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Enabled
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAuditModal(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Logs
              </button>
            </div>
          </div>
          
          <div 
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowMonitoringModal(true)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-medium">Resource Monitoring</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Monitor resource usage and receive alerts for potential issues.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Active
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMonitoringModal(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Metrics
              </button>
            </div>
          </div>
          
          <div 
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowSupportModal(true)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-medium">Support Tickets</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Create and manage support tickets for your organization.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Available
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSupportModal(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Tickets
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Total Users</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{users.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Teams</h3>
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{teams.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Apps Deployed</h3>
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-600">Active Containers</h3>
              <Server className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>
        </div>

        {/* Teams and Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teams */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Teams</h2>
              {isAdmin && (
                <Link
                  to="/enterprise/teams/create"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Team
                </Link>
              )}
            </div>
            <div className="p-6">
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No teams created yet</p>
                  {isAdmin && (
                    <Link
                      to="/enterprise/teams/create"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Team
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map(team => (
                    <Link
                      key={team.id}
                      to={`/enterprise/teams/${team.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{team.name}</h3>
                        <span className="text-sm text-gray-500">
                          {team.members?.length || 0} members
                        </span>
                      </div>
                      {team.description && (
                        <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Users */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Users</h2>
              {isAdmin && (
                <Link
                  to="/enterprise/users/invite"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite User
                </Link>
              )}
            </div>
            <div className="p-6">
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No users added yet</p>
                  {isAdmin && (
                    <Link
                      to="/enterprise/users/invite"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite First User
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {user.user?.name?.charAt(0) || user.user?.email?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.user?.name || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-500">{user.user?.email}</p>
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : user.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <LicenseManager onClose={() => setShowLicenseModal(false)} />
          </div>
        </div>
      )}
      
      {showSsoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <SsoConfigManager onClose={() => setShowSsoModal(false)} />
          </div>
        </div>
      )}
      
      {showDlpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <DlpRulesManager onClose={() => setShowDlpModal(false)} />
          </div>
        </div>
      )}
      
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full m-4 max-h-[90vh] overflow-hidden">
            <AuditLogViewer onClose={() => setShowAuditModal(false)} />
          </div>
        </div>
      )}
      
      {showMonitoringModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full m-4 max-h-[90vh] overflow-hidden">
            <ResourceMonitor onClose={() => setShowMonitoringModal(false)} />
          </div>
        </div>
      )}
      
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full m-4 max-h-[90vh] overflow-hidden">
            <SupportTicketManager onClose={() => setShowSupportModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}