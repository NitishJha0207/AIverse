import { useNavigate } from 'react-router-dom';
import { Code } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export function DeveloperButton() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!auth.isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnTo: '/developer/register',
          message: 'Please log in to continue with developer registration.' 
        } 
      });
      return;
    }

    try {
      setLoading(true);

      // Check if user is already a developer
      const { data: profile, error } = await supabase
        .from('developer_profiles')
        .select('id')
        .eq('user_id', auth.user?.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found, redirect to registration
          navigate('/developer/register');
        } else {
          throw error;
        }
        return;
      }

      if (profile) {
        // User is a developer, go directly to console
        navigate('/developer/console');
      } else {
        // Redirect to registration
        navigate('/developer/register');
      }
    } catch (error) {
      console.error('Failed to check developer status:', error);
      // On error, redirect to registration
      navigate('/developer/register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Code className="w-5 h-5" />
      {loading ? 'Checking...' : 'Developer Console'}
    </button>
  );
}