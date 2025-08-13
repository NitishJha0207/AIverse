import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseDashboard } from '../../components/enterprise/EnterpriseDashboard';
import { EnterpriseProvider, useEnterprise } from '../../context/EnterpriseContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertCircle, Building2, ArrowRight } from 'lucide-react';

function EnterpriseDashboardContent() {
  const { organization, loading, error, hasAccess } = useEnterprise();
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and no organization, redirect to setup
    if (!loading && !organization) {
      navigate('/enterprise/setup', { 
        state: { 
          message: 'You need to set up an organization first.' 
        } 
      });
    }
  }, [loading, organization, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            onClick={() => navigate('/enterprise/setup')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Set Up Organization
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
          <button
            onClick={() => navigate('/enterprise/setup')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Building2 className="w-5 h-5" />
            Create Organization
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return <EnterpriseDashboard />;
}

export default function EnterpriseDashboardPage() {
  return (
    <ErrorBoundary>
      <EnterpriseProvider>
        <EnterpriseDashboardContent />
      </EnterpriseProvider>
    </ErrorBoundary>
  );
}