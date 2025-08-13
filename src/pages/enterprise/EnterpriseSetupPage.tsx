import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrganizationSetup } from '../../components/enterprise/OrganizationSetup';
import { EnterpriseProvider, useEnterprise } from '../../context/EnterpriseContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function EnterpriseSetupContent() {
  const { organization, loading, error } = useEnterprise();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!auth.isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnTo: '/enterprise/setup',
          message: 'Please log in to set up your organization.' 
        } 
      });
      return;
    }

    // If already has an organization, redirect to dashboard
    if (!loading && organization) {
      navigate('/enterprise/dashboard');
      return;
    }

    setInitializing(false);
  }, [loading, organization, navigate, auth.isAuthenticated]);

  if (loading || initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-8">Enterprise Setup</h1>
        <OrganizationSetup />
      </div>
    </div>
  );
}

export default function EnterpriseSetupPage() {
  return (
    <ErrorBoundary>
      <EnterpriseProvider>
        <EnterpriseSetupContent />
      </EnterpriseProvider>
    </ErrorBoundary>
  );
}