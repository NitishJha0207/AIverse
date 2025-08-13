import React, { useState } from 'react';
import { UserPlus, AlertCircle, Check, Users } from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { addUserToOrganization } from '../../lib/enterprise';
import { LoadingSpinner } from '../LoadingSpinner';

export function UserInvite() {
  const { organization, license, refreshUsers } = useEnterprise();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    department: '',
    jobTitle: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) {
      setError('Organization not found');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await addUserToOrganization(
        organization.id,
        formData.email,
        formData.role,
        formData.department || undefined,
        formData.jobTitle || undefined
      );
      
      setSuccess(`Invitation sent to ${formData.email}`);
      setFormData({
        email: '',
        role: 'user',
        department: '',
        jobTitle: ''
      });
      
      // Refresh users list
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  if (!organization || !license) {
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

  const remainingLicenses = license.max_users - license.current_users;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Invite User</h2>
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
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800">License Usage</p>
            <p className="text-blue-700 text-sm">
              {license.current_users} of {license.max_users} licenses used ({remainingLicenses} remaining)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="user@example.com"
            disabled={loading || remainingLicenses <= 0}
          />
          {remainingLicenses <= 0 && (
            <p className="text-sm text-red-600 mt-1">
              No licenses available. Please upgrade your plan to add more users.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {formData.role === 'admin' 
              ? 'Admins have full control over the organization, including user management and settings.'
              : formData.role === 'manager'
              ? 'Managers can create and manage teams, but cannot change organization settings.'
              : 'Regular users can access apps and be part of teams.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Engineering, Marketing, etc."
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Software Engineer, Product Manager, etc."
            disabled={loading}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || remainingLicenses <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Inviting...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Send Invitation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}