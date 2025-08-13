import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PublishAppForm } from '../components/PublishAppForm';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AlertCircle } from 'lucide-react';

function PublishAppContent() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [developerProfile, setDeveloperProfile] = useState<any>(null);

  useEffect(() => {
    const checkDeveloperStatus = async () => {
      if (!auth.isAuthenticated) {
        navigate('/login', {
          state: {
            returnTo: '/developer/publish',
            message: 'Please log in to publish an app.'
          }
        });
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('developer_profiles')
          .select('id, payment_status')
          .eq('user_id', auth.user?.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile not found, redirect to registration
            navigate('/developer/register');
            return;
          }
          throw profileError;
        }

        // Skip payment check for testing
        // if (profile.payment_status !== 'active') {
        //   navigate('/developer/payment', { 
        //     state: { 
        //       developerId: profile.id,
        //       message: 'Please complete payment to publish apps.'
        //     }
        //   });
        //   return;
        // }

        setDeveloperProfile(profile);
        setLoading(false);
      } catch (err) {
        console.error('Failed to check developer status:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify developer status');
        setLoading(false);
      }
    };

    checkDeveloperStatus();
  }, [auth.isAuthenticated, auth.user?.id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PublishAppForm 
        onClose={() => navigate('/developer/console')} 
        developerId={developerProfile?.id}
      />
    </div>
  );
}

export default function PublishAppPage() {
  return (
    <ErrorBoundary>
      <PublishAppContent />
    </ErrorBoundary>
  );
}