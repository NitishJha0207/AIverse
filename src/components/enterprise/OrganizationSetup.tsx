import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Briefcase, Shield, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createOrganization } from '../../lib/enterprise';
import { LicenseTier } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';

export function OrganizationSetup() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    adminName: '',
    adminPassword: '',
    category: '',
    size: 'small',
    industry: '',
    tier: 'enterprise_standard' as LicenseTier
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.isAuthenticated || !auth.user) {
      setError('You must be logged in to create an organization');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Submitting organization creation:', {
        name: formData.name,
        domain: formData.domain,
        userId: auth.user.id,
        tier: formData.tier
      });
      
      const orgId = await createOrganization(
        formData.name,
        formData.domain,
        auth.user.id,
        formData.tier as LicenseTier
      );
      
      console.log('Organization created successfully with ID:', orgId);
      setSuccess(true);
      
      // Redirect to enterprise dashboard after a short delay
      setTimeout(() => {
        navigate('/enterprise/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.domain || !formData.adminName || !formData.adminPassword) {
        setError('All fields are required');
        return;
      }
      
      // Basic validation
      if (formData.adminPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      
      if (!formData.domain.includes('.')) {
        setError('Please enter a valid domain');
        return;
      }
    }
    
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Organization Created Successfully!</h2>
        <p className="text-gray-600 mb-6">
          Your organization has been set up and you're ready to start using enterprise features.
        </p>
        <p className="text-gray-600 mb-6">
          Redirecting to your enterprise dashboard...
        </p>
        <LoadingSpinner size="small" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Set Up Your Organization</h2>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Organization Details
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Acme Corporation"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="acme.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                This domain will be used for SSO integration and email verification.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Admin Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.adminName}
                onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be the primary admin account for your organization.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                One-Time Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.adminPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                You will be asked to change this password on first login.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="government">Government</option>
                <option value="nonprofit">Non-Profit</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Size <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Small (1-50 employees)</option>
                <option value="medium">Medium (51-200 employees)</option>
                <option value="large">Large (201-1000 employees)</option>
                <option value="enterprise">Enterprise (1000+ employees)</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              License Tier
            </h3>
            
            <div className="space-y-4">
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  formData.tier === 'enterprise_standard' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, tier: 'enterprise_standard' as LicenseTier }))}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Enterprise General License</h4>
                  {formData.tier === 'enterprise_standard' && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  General license with important features. Limited to 2 employees.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Team management</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">SSO integration</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Basic security</span>
                </div>
                <div className="mt-3 text-sm font-medium text-blue-600">
                  2 user accounts included
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  formData.tier === 'enterprise_premium' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, tier: 'enterprise_premium' as LicenseTier }))}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Enterprise Premium License</h4>
                  {formData.tier === 'enterprise_premium' && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  All General features plus advanced capabilities. Limited to 5 employees.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">All General features</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Advanced security</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Custom branding</span>
                </div>
                <div className="mt-3 text-sm font-medium text-blue-600">
                  5 user accounts included
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  formData.tier === 'basic' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, tier: 'basic' as LicenseTier }))}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Enterprise Advanced License</h4>
                  {formData.tier === 'basic' && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  All Premium features plus enterprise-grade capabilities. Limited to 10 employees.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">All Premium features</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Advanced analytics</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Priority support</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Custom integrations</span>
                </div>
                <div className="mt-3 text-sm font-medium text-blue-600">
                  10 user accounts included
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Review & Confirm
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Organization Name</h4>
                <p className="font-medium">{formData.name}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Domain</h4>
                <p className="font-medium">{formData.domain}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Admin Username</h4>
                <p className="font-medium">{formData.adminName}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Password</h4>
                <p className="font-medium">••••••••</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Category</h4>
                <p className="font-medium">{formData.category}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Organization Size</h4>
                <p className="font-medium">{formData.size}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">License Tier</h4>
                <p className="font-medium">
                  {formData.tier === 'enterprise_standard' ? 'Enterprise General License (2 users)' : 
                   formData.tier === 'enterprise_premium' ? 'Enterprise Premium License (5 users)' : 
                   'Enterprise Advanced License (10 users)'}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                By creating this organization, you'll be set up as the organization admin. You'll be able to invite users, manage teams, and configure enterprise settings.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              Back
            </button>
          )}
          
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  <span>Create Organization</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}