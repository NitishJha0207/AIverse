import React, { useState } from 'react';
import { 
  Shield, 
  Settings, 
  Lock, 
  FileText, 
  Globe, 
  AlertCircle, 
  Check,
  RefreshCw
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { updateEnterpriseSettings } from '../../lib/enterprise';
import { LoadingSpinner } from '../LoadingSpinner';

export function EnterpriseSettings() {
  const { organization, settings, refreshSettings } = useEnterprise();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [securitySettings, setSecuritySettings] = useState(
    settings?.security_policy || {
      password_policy: {
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special_chars: true,
        max_age_days: 90
      },
      mfa_required: false,
      session_timeout_minutes: 60,
      ip_restrictions: []
    }
  );
  
  const [complianceSettings, setComplianceSettings] = useState(
    settings?.compliance_settings || {
      data_retention_days: 365,
      audit_log_enabled: true,
      dlp_enabled: false,
      dlp_rules: []
    }
  );
  
  const [newIpRestriction, setNewIpRestriction] = useState('');

  const handleSaveSettings = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await updateEnterpriseSettings(organization.id, {
        organization_id: organization.id,
        security_policy: securitySettings,
        compliance_settings: complianceSettings
      });
      
      setSuccess('Settings updated successfully');
      
      // Refresh settings
      await refreshSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIpRestriction = () => {
    if (!newIpRestriction) return;
    
    // Simple IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(newIpRestriction)) {
      setError('Please enter a valid IP address or CIDR range');
      return;
    }
    
    setSecuritySettings(prev => ({
      ...prev,
      ip_restrictions: [...prev.ip_restrictions, newIpRestriction]
    }));
    
    setNewIpRestriction('');
    setError(null);
  };

  const handleRemoveIpRestriction = (ip: string) => {
    setSecuritySettings(prev => ({
      ...prev,
      ip_restrictions: prev.ip_restrictions.filter(item => item !== ip)
    }));
  };

  if (!organization || !settings) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Not Found</h3>
          <p className="text-gray-600">Please set up your organization first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Enterprise Settings</h2>
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

      <div className="space-y-8">
        {/* Security Settings */}
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Security Settings
          </h3>
          
          <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
            {/* Password Policy */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-700" />
                Password Policy
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={securitySettings.password_policy.min_length}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      password_policy: {
                        ...prev.password_policy,
                        min_length: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Age (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={securitySettings.password_policy.max_age_days}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      password_policy: {
                        ...prev.password_policy,
                        max_age_days: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set to 0 to disable password expiration
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={securitySettings.password_policy.require_uppercase}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        password_policy: {
                          ...prev.password_policy,
                          require_uppercase: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Require uppercase letters</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={securitySettings.password_policy.require_lowercase}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        password_policy: {
                          ...prev.password_policy,
                          require_lowercase: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Require lowercase letters</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={securitySettings.password_policy.require_numbers}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        password_policy: {
                          ...prev.password_policy,
                          require_numbers: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Require numbers</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={securitySettings.password_policy.require_special_chars}
                      onChange={(e) => setSecuritySettings(prev => ({
                        ...prev,
                        password_policy: {
                          ...prev.password_policy,
                          require_special_chars: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Require special characters</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* MFA Settings */}
            <div>
              <h4 className="font-medium mb-3">Multi-Factor Authentication</h4>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={securitySettings.mfa_required}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    mfa_required: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Require MFA for all users</span>
              </label>
            </div>
            
            {/* Session Settings */}
            <div>
              <h4 className="font-medium mb-3">Session Settings</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={securitySettings.session_timeout_minutes}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    session_timeout_minutes: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* IP Restrictions */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-700" />
                IP Restrictions
              </h4>
              
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newIpRestriction}
                  onChange={(e) => setNewIpRestriction(e.target.value)}
                  placeholder="192.168.1.0/24"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddIpRestriction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {securitySettings.ip_restrictions.length === 0 ? (
                  <p className="text-sm text-gray-500">No IP restrictions. All IPs are allowed.</p>
                ) : (
                  securitySettings.ip_restrictions.map((ip, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
                    >
                      <span>{ip}</span>
                      <button
                        onClick={() => handleRemoveIpRestriction(ip)}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200"
                      >
                        <AlertCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Compliance Settings */}
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Compliance Settings
          </h3>
          
          <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
            {/* Data Retention */}
            <div>
              <h4 className="font-medium mb-3">Data Retention</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Retention Period (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="3650"
                  value={complianceSettings.data_retention_days}
                  onChange={(e) => setComplianceSettings(prev => ({
                    ...prev,
                    data_retention_days: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Audit Logging */}
            <div>
              <h4 className="font-medium mb-3">Audit Logging</h4>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={complianceSettings.audit_log_enabled}
                  onChange={(e) => setComplianceSettings(prev => ({
                    ...prev,
                    audit_log_enabled: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable comprehensive audit logging</span>
              </label>
            </div>
            
            {/* Data Loss Prevention */}
            <div>
              <h4 className="font-medium mb-3">Data Loss Prevention (DLP)</h4>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={complianceSettings.dlp_enabled}
                  onChange={(e) => setComplianceSettings(prev => ({
                    ...prev,
                    dlp_enabled: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable DLP scanning</span>
              </label>
              
              {complianceSettings.dlp_enabled && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    DLP rules configuration is available in the advanced settings panel.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}