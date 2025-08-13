import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Building2, Mail, Lock, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { getOrganizationByDomain } from '../../lib/enterprise';

interface LocationState {
  returnTo?: string;
  message?: string;
  organizationDomain?: string;
}

export default function EnterpriseLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  
  // Get return path and message from location state if available
  const state = location.state as LocationState;
  const returnTo = state?.returnTo || '/enterprise/dashboard';
  const message = state?.message;
  const organizationDomain = state?.organizationDomain;

  useEffect(() => {
    // If domain is provided in state, auto-fill and verify
    if (organizationDomain) {
      setDomain(organizationDomain);
      verifyDomain(organizationDomain);
    }
  }, [organizationDomain]);

  const verifyDomain = async (domainToVerify: string) => {
    if (!domainToVerify) {
      setError('Please enter your organization domain');
      return;
    }

    try {
      setVerifyingDomain(true);
      setError(null);
      
      console.log("Verifying domain:", domainToVerify);
      
      // Direct database query to check if organization exists with this domain
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          license:licenses(*)
        `)
        .eq('domain', domainToVerify)
        .single();
      
      console.log("Domain verification result:", { data, error });
      
      if (error) {
        if (error.code === 'PGRST116') {
          setError('No organization found with this domain');
          setDomainVerified(false);
          setOrganization(null);
          return;
        }
        throw error;
      }

      if (!data) {
        setError('No organization found with this domain');
        setDomainVerified(false);
        setOrganization(null);
        return;
      }

      setDomainVerified(true);
      setOrganization(data);
    } catch (err) {
      console.error("Domain verification error:", err);
      setError(err instanceof Error ? err.message : 'Failed to verify domain');
      setDomainVerified(false);
      setOrganization(null);
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyDomain(domain);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    // Verify domain format
    if (!domain.includes('.')) {
      setError('Please enter a valid domain');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First verify the domain matches an organization
      if (!domainVerified) {
        await verifyDomain(domain);
        if (!domainVerified) {
          setLoading(false);
          return;
        }
      }

      // Verify email domain matches organization domain
      const emailDomain = email.split('@')[1];
      if (emailDomain !== domain) {
        setError(`Email must be from the ${domain} domain`);
        setLoading(false);
        return;
      }

      // Login with Supabase
      await login(email, password);
      
      // Check if user is part of the organization
      const { data: orgUser, error: orgUserError } = await supabase
        .from('organization_users')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('user_id', auth.user?.id)
        .maybeSingle();

      if (orgUserError && orgUserError.code !== 'PGRST116') {
        throw orgUserError;
      }

      // If user is not part of organization but email domain matches, add them
      if (!orgUser && email.endsWith(`@${domain}`)) {
        await supabase
          .from('organization_users')
          .insert({
            organization_id: organization.id,
            user_id: auth.user?.id,
            role: 'user' // Default role
          });
      }

      // Navigate to enterprise dashboard
      navigate(returnTo);
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else {
        setError(error.message || 'Failed to login');
      }
      setLoading(false);
    }
  };

  // Check if user is already logged in and part of an organization
  useEffect(() => {
    const checkOrganizationAccess = async () => {
      if (auth.isAuthenticated && auth.user) {
        try {
          // Direct query to check if user is part of any organization
          const { data, error } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', auth.user.id)
            .maybeSingle();
          
          if (!error && data) {
            // User already has an organization, redirect to dashboard
            navigate('/enterprise/dashboard');
          }
        } catch (err) {
          console.error('Error checking organization access:', err);
        }
      }
    };
    
    checkOrganizationAccess();
  }, [auth.isAuthenticated, auth.user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center">
          <div className="flex justify-center">
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Enterprise Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your organization's account
          </p>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!domainVerified ? (
          <form className="mt-8 space-y-6" onSubmit={handleDomainSubmit}>
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Domain
              </label>
              <div className="relative">
                <input
                  id="domain"
                  name="domain"
                  type="text"
                  required
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={verifyingDomain}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="yourcompany.com"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter your organization's domain (e.g., company.com)
              </p>
            </div>

            <button
              type="submit"
              disabled={verifyingDomain || !domain}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyingDomain ? (
                <>
                  <LoadingSpinner size="small" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <Building2 className="w-5 h-5" />
                  <span>{organization?.name}</span>
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Sign in with your {domain} email address
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder={`your.name@${domain}`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setDomainVerified(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Use a different organization
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an enterprise account?{' '}
            <Link to="/enterprise/setup" className="font-medium text-blue-600 hover:text-blue-500">
              Set up your organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}