import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Check, 
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { configureDlpRules, getDlpRules } from '../../lib/enterprise';
import { LoadingSpinner } from '../LoadingSpinner';

interface DlpRule {
  id: string;
  name: string;
  pattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'block' | 'redact';
}

interface DlpRulesManagerProps {
  onClose?: () => void;
}

export function DlpRulesManager({ onClose }: DlpRulesManagerProps) {
  const { organization, settings, refreshSettings } = useEnterprise();
  const [rules, setRules] = useState<DlpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newRule, setNewRule] = useState<Partial<DlpRule>>({
    name: '',
    pattern: '',
    description: '',
    severity: 'medium',
    action: 'alert'
  });

  useEffect(() => {
    fetchRules();
  }, [organization?.id]);

  const fetchRules = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const dlpRules = await getDlpRules(organization.id);
      setRules(dlpRules as DlpRule[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch DLP rules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    if (!newRule.name || !newRule.pattern) {
      setError('Rule name and pattern are required');
      return;
    }
    
    const rule: DlpRule = {
      id: crypto.randomUUID(),
      name: newRule.name,
      pattern: newRule.pattern,
      description: newRule.description || '',
      severity: newRule.severity as 'low' | 'medium' | 'high' | 'critical',
      action: newRule.action as 'alert' | 'block' | 'redact'
    };
    
    setRules([...rules, rule]);
    setNewRule({
      name: '',
      pattern: '',
      description: '',
      severity: 'medium',
      action: 'alert'
    });
    setError(null);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleSaveRules = async () => {
    if (!organization) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await configureDlpRules(organization.id, rules);
      
      setSuccess('DLP rules saved successfully');
      await refreshSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save DLP rules');
    } finally {
      setSaving(false);
    }
  };

  if (!organization || !settings) {
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
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">Data Loss Prevention Rules</h2>
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
        <p className="text-blue-800">
          Data Loss Prevention (DLP) rules help protect sensitive information from being shared outside your organization.
          Configure rules to detect and take action on sensitive data patterns.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">DLP Configuration</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRules}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh rules"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Enable DLP:</span>
              <button
                onClick={() => {
                  if (!settings) return;
                  const updatedSettings = {
                    ...settings,
                    compliance_settings: {
                      ...settings.compliance_settings,
                      dlp_enabled: !settings.compliance_settings.dlp_enabled
                    }
                  };
                  refreshSettings();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.compliance_settings.dlp_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.compliance_settings.dlp_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="medium" message="Loading DLP rules..." />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="font-medium mb-4">Current Rules</h4>
            
            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No DLP rules configured. Add rules below.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pattern
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {rule.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <code className="bg-gray-100 px-2 py-1 rounded">{rule.pattern}</code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            rule.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {rule.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rule.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {rule.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveRule(rule.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h4 className="font-medium mb-4">Add New Rule</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Credit Card Detection"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pattern <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., \b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <select
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="alert">Alert Only</option>
                    <option value="redact">Redact Content</option>
                    <option value="block">Block Transmission</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this rule detects and why it's important"
                  rows={3}
                />
              </div>
              
              <button
                onClick={handleAddRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Rule
              </button>
            </div>
          </div>
        )}
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
          onClick={handleSaveRules}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <LoadingSpinner size="small" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Rules</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}