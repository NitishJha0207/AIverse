import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserInvite } from '../../components/enterprise/UserInvite';
import { EnterpriseProvider } from '../../context/EnterpriseContext';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function UserInvitePage() {
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
            
            <h1 className="text-3xl font-bold mb-8">Invite User</h1>
            
            <UserInvite />
          </div>
        </div>
      </EnterpriseProvider>
    </ErrorBoundary>
  );
}