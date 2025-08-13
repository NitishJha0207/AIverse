import React, { useState } from 'react';
import { 
  Lock, 
  Globe, 
  AlertCircle, 
  Check, 
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { configureSso } from '../../lib/enterprise';
import { LoadingSpinner } from '../LoadingSpinner';

interface SsoConfigManagerProps {
  onClose?: () => void;
}

export function SsoConfigManager({ onClose }: SsoConfigManagerProps) {
  const { organization, refreshOrganization } = useEnterprise();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [provider, setProvider] = useState<'azure' | 'google' | 'okta' | 'custom'>(
    (organization?.sso_provider as any) || 'azure'
  );
  
  const [config, setConfig] = useState<Record<string, any>>(
    organization?.sso_config || {
      client_id: '',
      tenant_id: '',
      redirect_uri: window.location.origin + '/auth/callback',
      scope: 'openid profile email',
      response_type: 'code',
      domain_restriction: organization?.domain || ''
    }
  );

  const handleSave = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate required fields
      if (!config.client_id) {
        throw new Error('Client ID is required');
      }
      
      if (provider === 'azure' && !config.tenant_id) {
        throw new Error('Tenant ID is required for Azure AD');
      }
      
      await configureSso(organization.id, provider, config);
      
      setSuccess('SSO configuration saved successfully');
      await refreshOrganization();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SSO configuration');
    } finally {
      setLoading(false);
    }
  };

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
          <Lock className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">SSO Configuration</h2>
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">Domain Restriction</h3>
            <p className="text-blue-700 text-sm">
              SSO will be restricted to users with email addresses from: <strong>{organization.domain}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="font-medium mb-4">SSO Provider</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setProvider('azure')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 ${
              provider === 'azure' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Microsoft_Azure.svg/1200px-Microsoft_Azure.svg.png" 
              alt="Azure AD" 
              className="w-8 h-8"
            />
            <span className="text-sm font-medium">Azure AD</span>
          </button>
          
          <button
            onClick={() => setProvider('google')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 ${
              provider === 'google' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1200px-Google_%22G%22_Logo.svg.png" 
              alt="Google" 
              className="w-8 h-8"
            />
            <span className="text-sm font-medium">Google</span>
          </button>
          
          <button
            onClick={() => setProvider('okta')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 ${
              provider === 'okta' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <img 
              src="https://www.okta.com/sites/default/files/media/image/2021-02/Okta_Logo_BrightBlue_Medium.png" 
              alt="Okta" 
              className="w-8 h-8"
            />
            <span className="text-sm font-medium">Okta</span>
          </button>
          
          <button
            onClick={() => setProvider('custom')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 ${
              provider === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <Globe className="w-8 h-8 text-gray-600" />
            <span className="text-sm font-medium">Custom</span>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.client_id || ''}
              onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter client ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Secret <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={config.client_secret || ''}
              onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter client secret"
            />
          </div>
          
          {provider === 'azure' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.tenant_id || ''}
                onChange={(e) => setConfig({ ...config, tenant_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tenant ID"
              />
            </div>
          )}
          
          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authorization URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.auth_url || ''}
                onChange={(e) => setConfig({ ...config, auth_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter authorization URL"
              />
            </div>
          )}
          
          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.token_url || ''}
                onChange={(e) => setConfig({ ...config, token_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter token URL"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Redirect URI
            </label>
            <input
              type="text"
              value={config.redirect_uri || window.location.origin + '/auth/callback'}
              onChange={(e) => setConfig({ ...config, redirect_uri: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter redirect URI"
            />
            <p className="mt-1 text-sm text-gray-500">
              Configure this URI in your SSO provider's settings.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <input
              type="text"
              value={config.scope || 'openid profile email'}
              onChange={(e) => setConfig({ ...config, scope: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter scope"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enforce_domain"
              checked={config.enforce_domain_restriction || false}
              onChange={(e) => setConfig({ ...config, enforce_domain_restriction: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="enforce_domain" className="text-sm text-gray-700">
              Enforce domain restriction ({organization.domain})
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
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
              <Save className="w-5 h-5" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}