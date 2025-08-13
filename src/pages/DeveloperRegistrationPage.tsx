import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Code2, Users, Briefcase, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function DeveloperRegistrationPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    team_size: 'solo' as 'solo' | 'team',
    profession: '',
    specialization: [] as string[],
    country: '',
    phone_number: ''
  });

  useEffect(() => {
    const checkExistingProfile = async () => {
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
        // Check if user already has a developer profile
        const { data: profile, error: profileError } = await supabase
          .from('developer_profiles')
          .select('id')
          .eq('user_id', auth.user?.id)
          .single();

        if (profile) {
          // User already has a profile, redirect to publish page
          navigate('/developer/publish', { replace: true });
          return;
        }

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to check developer profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to check developer status');
        setLoading(false);
      }
    };

    checkExistingProfile();
  }, [auth.isAuthenticated, auth.user?.id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);

      if (!auth.user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!formData.profession || !formData.country) {
        throw new Error('Please fill in all required fields');
      }

      // Create developer profile
      const { data: profile, error: profileError } = await supabase
        .from('developer_profiles')
        .insert({
          user_id: auth.user.id,
          company_name: formData.company_name || null,
          team_size: formData.team_size,
          profession: formData.profession,
          specialization: formData.specialization,
          country: formData.country,
          phone_number: formData.phone_number || null,
          payment_status: 'active',
          registration_date: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error('Failed to create developer profile');
      }

      // Update user record to mark as developer
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ is_developer: true })
        .eq('id', auth.user.id);

      if (userUpdateError) {
        console.error('Failed to update user as developer:', userUpdateError);
      }

      // Navigate to publish app page
      navigate('/developer/publish', { replace: true });
    } catch (err) {
      console.error('Failed to register developer:', err);
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Developer Registration</h1>
          <p className="mt-2 text-gray-600">
            Join our developer community and publish your AI apps
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name (Optional)
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your company name (if applicable)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Size
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, team_size: 'solo' }))}
                  className={`flex items-center gap-3 p-4 border rounded-lg ${
                    formData.team_size === 'solo'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-500'
                  }`}
                >
                  <Code2 className="w-5 h-5" />
                  <span>Solo Developer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, team_size: 'team' }))}
                  className={`flex items-center gap-3 p-4 border rounded-lg ${
                    formData.team_size === 'team'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-500'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Team/Company</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profession <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.profession}
                onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Software Engineer, Data Scientist"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <div className="space-y-2">
                {['AI/ML', 'Web Development', 'Mobile Apps', 'Data Science', 'Cloud Computing'].map(spec => (
                  <label key={spec} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.specialization.includes(spec)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            specialization: [...prev.specialization, spec]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            specialization: prev.specialization.filter(s => s !== spec)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{spec}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="small" />
                  Processing...
                </>
              ) : (
                <>
                  <Briefcase className="w-5 h-5" />
                  Register as Developer
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DeveloperRegistrationPage;