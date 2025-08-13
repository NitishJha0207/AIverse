import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Calendar, 
  Check, 
  AlertCircle, 
  RefreshCw,
  X
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { LicenseTier } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

interface LicenseManagerProps {
  onClose?: () => void;
}

export function LicenseManager({ onClose }: LicenseManagerProps) {
  const { organization, license, refreshOrganization } = useEnterprise();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshOrganization();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh license information');
    } finally {
      setRefreshing(false);
    }
  };

  if (!organization || !license) {
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

  const daysRemaining = license ? 
    Math.max(0, Math.floor((new Date(license.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 
    0;

  const usagePercentage = license ? 
    Math.min(100, Math.round((license.current_users / license.max_users) * 100)) : 
    0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">License Management</h2>
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

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">License Information</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Refresh license information"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <span className="text-sm text-gray-500">Organization</span>
              <p className="font-medium">{organization.name}</p>
            </div>
            
            <div className="mb-4">
              <span className="text-sm text-gray-500">License Tier</span>
              <p className="font-medium">
                {license.tier === LicenseTier.ENTERPRISE_STANDARD ? 'Enterprise Standard' : 
                 license.tier === LicenseTier.ENTERPRISE_PREMIUM ? 'Enterprise Premium' : 
                 'Basic'}
              </p>
            </div>
            
            <div className="mb-4">
              <span className="text-sm text-gray-500">Status</span>
              <div className="flex items-center gap-2 mt-1">
                {license.is_active ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-700 font-medium">Inactive</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">User Licenses</span>
                <span className="text-sm font-medium">{license.current_users} / {license.max_users}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Expiration Date</span>
              </div>
              <p className="font-medium mt-1">{new Date(license.expires_at).toLocaleDateString()}</p>
              <p className="text-sm text-gray-500 mt-1">
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Included Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {license.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <span>{feature.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}