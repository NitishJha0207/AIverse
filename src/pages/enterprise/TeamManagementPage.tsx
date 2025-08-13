import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TeamManagement } from '../../components/enterprise/TeamManagement';
import { EnterpriseProvider } from '../../context/EnterpriseContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function TeamManagementPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Team ID Required</h2>
          <p className="text-gray-600 mb-4">Please select a team to manage.</p>
          <Link
            to="/enterprise/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <EnterpriseProvider>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <Link
                to="/enterprise/dashboard"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
            
            <h1 className="text-3xl font-bold mb-8">Team Management</h1>
            
            <TeamManagement teamId={id} />
          </div>
        </div>
      </EnterpriseProvider>
    </ErrorBoundary>
  );
}