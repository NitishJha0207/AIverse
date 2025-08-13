import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { AppSubmission } from '../types';
import { supabase } from '../lib/supabase';
import { DeveloperMetrics } from '../components/DeveloperMetrics';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function AppMetricsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchAppDetails = async () => {
      try {
        if (!id) return;

        setLoading(true);
        setError(null);

        const { data, error: appError } = await supabase
          .from('app_submissions')
          .select('*')
          .eq('id', id)
          .single();

        if (appError) throw appError;
        setApp(data);
      } catch (err) {
        console.error('Failed to fetch app details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load app details');
      } finally {
        setLoading(false);
      }
    };

    fetchAppDetails();
  }, [id]);

  const handleDeleteApp = async () => {
    if (!app || !confirm('Are you sure you want to delete this app?')) return;
    
    try {
      setDeleting(true);
      
      // Delete the app submission
      const { error } = await supabase
        .from('app_submissions')
        .delete()
        .eq('id', app.id);
      
      if (error) throw error;
      
      // Navigate back to console
      navigate('/developer/console');
      
    } catch (err) {
      console.error('Failed to delete app:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete app');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading app metrics..." />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error || 'App not found'}</span>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => navigate('/developer/console')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Console
          </button>
        </div>
      </div>
    );
  }
}