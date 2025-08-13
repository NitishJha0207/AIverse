import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  AlertCircle, 
  Check, 
  X, 
  Store,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCcw,
  Building2,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppListing, AppSubmission, Organization } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

function AdminPortalContent() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<AppListing[]>([]);
  const [pendingApps, setPendingApps] = useState<AppSubmission[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    developer_name: '',
    original_store: '',
    store_url: '',
    price: 0,
    category: '',
    tags: [] as string[],
    rating: 0,
    reviews_count: 0,
    reviews: [] as any[],
    icon_url: '',
    screenshots: [] as string[],
    features: [] as string[],
    is_available: true
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [processingApp, setProcessingApp] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'apps' | 'organizations'>('apps');

  const fetchData = async () => {
    try {
      if (!auth.isAuthenticated) {
        navigate('/login', { 
          state: { 
            returnTo: '/admin',
            message: 'Please log in to access the admin portal.' 
          } 
        });
        return;
      }

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email')
        .eq('user_id', auth.user?.id)
        .single();

      if (adminError || !adminUser) {
        console.error('Admin access check failed:', adminError);
        navigate('/', { replace: true });
        return;
      }

      // Fetch existing apps
      const { data: listings, error: appsError } = await supabase
        .from('app_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      setApps(listings || []);

      // Fetch pending submissions with developer info
      const { data: submissions, error: submissionsError } = await supabase
        .from('app_submissions')
        .select(`
          *,
          developer:developer_profiles(
            id,
            company_name,
            user:users(
              id,
              email
            )
          )
        `)
        .in('status', ['pending', 'pending_review'])
        .order('submission_date', { ascending: true });

      if (submissionsError) throw submissionsError;
      setPendingApps(submissions || []);

      // Fetch organizations with explicit relationship
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          *,
          license:licenses!organizations_license_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      setOrganizations(orgs || []);

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin portal');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate, auth.isAuthenticated, auth.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { error } = await supabase
        .from('app_listings')
        .insert([formData]);

      if (error) throw error;

      // Reset form and refresh apps
      setFormData({
        name: '',
        description: '',
        short_description: '',
        developer_name: '',
        original_store: '',
        store_url: '',
        price: 0,
        category: '',
        tags: [],
        rating: 0,
        reviews_count: 0,
        reviews: [],
        icon_url: '',
        screenshots: [],
        features: [],
        is_available: true
      });
      setShowAddForm(false);
      
      // Show success message
      setSuccessMessage('App added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh data
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add app');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app?')) return;

    try {
      const { error } = await supabase
        .from('app_listings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApps(apps.filter(app => app.id !== id));
      setSuccessMessage('App deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app');
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await fetchData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setRetrying(false);
    }
  };

  const handleApproveApp = async (submission: AppSubmission) => {
    try {
      setProcessingApp(submission.id);
      setError(null);

      // Update submission status to approved
      const { error: updateError } = await supabase
        .from('app_submissions')
        .update({ status: 'approved' })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchData();
      
      setSuccessMessage('App approved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to approve app:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve app');
    } finally {
      setProcessingApp(null);
    }
  };

  const handleRejectApp = async (submission: AppSubmission) => {
    try {
      setProcessingApp(submission.id);
      setError(null);

      // Update submission status to rejected
      const { error: updateError } = await supabase
        .from('app_submissions')
        .update({ status: 'rejected' })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchData();
      
      setSuccessMessage('App rejected successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to reject app:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject app');
    } finally {
      setProcessingApp(null);
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrganizations(organizations.filter(org => org.id !== id));
      setSuccessMessage('Organization deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading admin portal..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Admin Portal</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCcw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
              Try Again
            </button>
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600">Manage AI apps, organizations, and review submissions</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Refresh data"
            >
              <RefreshCcw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'apps' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Add External App
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'apps'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('apps')}
          >
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Apps
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'organizations'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('organizations')}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organizations
            </div>
          </button>
        </div>

        {activeTab === 'apps' && (
          <>
            {/* Pending Reviews Section */}
            <div className="bg-white rounded-lg shadow-sm mb-8">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">Pending Reviews</h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {pendingApps.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No apps pending review
                  </div>
                ) : (
                  pendingApps.map(submission => (
                    <div key={submission.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <img
                            src={submission.icon_url || 'https://via.placeholder.com/48'}
                            alt={`${submission.name} icon`}
                            className="w-12 h-12 rounded-lg"
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{submission.name}</h3>
                            <p className="text-sm text-gray-600">{submission.short_description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-500">
                                Developer: {submission.developer?.company_name}
                              </span>
                              <span className="text-sm text-gray-500">
                                Email: {submission.developer?.user?.email}
                              </span>
                              <span className="text-sm text-gray-500">
                                Submitted: {new Date(submission.submission_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            to={`/app/${submission.id}`}
                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </Link>
                          <button
                            onClick={() => handleApproveApp(submission)}
                            disabled={processingApp === submission.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {processingApp === submission.id ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectApp(submission)}
                            disabled={processingApp === submission.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {processingApp === submission.id ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Category</span>
                          <p className="font-medium">{submission.category}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Price</span>
                          <p className="font-medium">${(submission.price || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Version</span>
                          <p className="font-medium">{submission.version || '1.0.0'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Features</span>
                          <p className="font-medium">{submission.features?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Published Apps Section */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold">Published Apps</h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {apps.map(app => (
                  <div key={app.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img
                          src={app.icon_url || 'https://via.placeholder.com/48'}
                          alt={`${app.name} icon`}
                          className="w-12 h-12 rounded-lg"
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{app.name}</h3>
                          <p className="text-sm text-gray-600">{app.short_description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-gray-500">
                              Developer: {app.developer_name}
                            </span>
                            {app.original_store && (
                              <span className="text-sm text-gray-500">
                                Store: {app.original_store}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {app.store_url && (
                          <a
                            href={app.store_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                          >
                            View in Store
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          to={`/app/${app.id}`}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Category</span>
                        <p className="font-medium">{app.category}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Price</span>
                        <p className="font-medium">${(app.price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Rating</span>
                        <p className="font-medium">{(app.rating || 0).toFixed(1)} ({app.reviews_count || 0})</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Features</span>
                        <p className="font-medium">{app.features?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'organizations' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Enterprise Organizations</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {organizations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No organizations found
                </div>
              ) : (
                organizations.map(org => (
                  <div key={org.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{org.name}</h3>
                          <p className="text-sm text-gray-600">{org.domain}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-gray-500">
                              License: {org.license?.tier === 'enterprise_standard' ? 'Enterprise Standard' : 
                                        org.license?.tier === 'enterprise_premium' ? 'Enterprise Premium' : 'Basic'}
                            </span>
                            <span className="text-sm text-gray-500">
                              Users: {org.license?.current_users || 0} / {org.license?.max_users || 0}
                            </span>
                            <span className="text-sm text-gray-500">
                              Created: {new Date(org.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/organizations/${org.id}`}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDeleteOrganization(org.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Admin</span>
                        <p className="font-medium">
                          {org.admin_user_id ? (
                            <Link to={`/admin/users/${org.admin_user_id}`} className="text-blue-600 hover:underline">
                              {org.admin_user_id.substring(0, 8)}...
                            </Link>
                          ) : (
                            'None'
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">SSO Status</span>
                        <p className="font-medium">
                          {org.sso_enabled ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Enabled ({org.sso_provider})
                            </span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Disabled
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">License Expires</span>
                        <p className="font-medium">
                          {org.license?.expires_at ? new Date(org.license.expires_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <ErrorBoundary>
      <AdminPortalContent />
    </ErrorBoundary>
  );
}