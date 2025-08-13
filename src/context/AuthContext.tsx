import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AuthState, UserProfile } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { persistSession, validateSession, clearSession } from '../lib/session';

const AuthContext = createContext<{
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, profile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found is okay
      throw error;
    }
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!mounted) return;

        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          if (profile && mounted) {
            setAuth({
              isAuthenticated: true,
              user: profile,
              loading: false,
              error: null
            });
            return;
          }
        }

        if (mounted) {
          setAuth({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuth({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: handleError(error)
          });
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          persistSession(session);
          const profile = await getUserProfile(session.user.id);
          
          if (profile && mounted) {
            setAuth({
              isAuthenticated: true,
              user: profile,
              loading: false,
              error: null
            });

            // Preserve current location or redirect appropriately
            const returnTo = location.state?.returnTo || '/';
            navigate(returnTo, { replace: true });
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          clearSession();
          setAuth({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
          
          // Only redirect to home if not already there
          if (location.pathname !== '/') {
            navigate('/', { replace: true });
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        if (mounted) {
          setAuth({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: handleError(error)
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  const login = async (email: string, password: string) => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password.trim()
      });

      if (error) throw error;
      if (!data.user) throw new Error('Authentication failed');

      const profile = await getUserProfile(data.user.id);
      if (!profile) throw new Error('Failed to load user profile');

      setAuth({
        isAuthenticated: true,
        user: profile,
        loading: false,
        error: null
      });

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (adminUser) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: handleError(error)
      }));
      throw error;
    }
  };

  const register = async (email: string, password: string, profile: Partial<UserProfile>) => {
    try {
      setAuth(prev => ({ ...prev, loading: true, error: null }));

      // Step 1: Create auth user with minimal data first
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: profile.fullName
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Registration failed');

      console.log('User created successfully:', data.user.id);

      // Step 2: Create user profile manually to ensure it exists
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: profile.fullName,
            date_of_birth: profile.dateOfBirth,
            country: profile.country,
            hobbies: profile.hobbies || [],
            preferences: profile.preferences || {},
            privacy_settings: profile.privacySettings || {
              share_location: false,
              share_phone: false,
              share_preferences: false,
              share_hobbies: false,
              share_name: false,
              share_country: false,
              share_dob: false
            }
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway as we'll try to fetch or create it below
        }
      } catch (profileCreateError) {
        console.error('Error during profile creation:', profileCreateError);
        // Continue to next step
      }

      // Step 3: Get or create the user profile
      let userProfile = await getUserProfile(data.user.id);
      
      // If profile doesn't exist, try creating it again with a delay
      if (!userProfile) {
        console.warn('Profile not found after creation, trying again...');
        
        // Wait a moment for database operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try fetching again
        userProfile = await getUserProfile(data.user.id);
        
        // If still not found, create a minimal profile
        if (!userProfile) {
          console.warn('Still no profile, creating minimal profile');
          
          try {
            // Create a minimal profile
            const { error: minimalProfileError } = await supabase
              .from('user_profiles')
              .insert({
                id: data.user.id,
                full_name: profile.fullName || 'New User'
              });
              
            if (minimalProfileError) {
              console.error('Minimal profile creation error:', minimalProfileError);
            } else {
              // Try fetching one more time
              userProfile = await getUserProfile(data.user.id);
            }
          } catch (minimalProfileError) {
            console.error('Error creating minimal profile:', minimalProfileError);
          }
        }
      }

      // Update auth state if we have a profile
      if (userProfile) {
        setAuth({
          isAuthenticated: true,
          user: userProfile,
          loading: false,
          error: null
        });
      } else {
        // Even without a profile, consider the user logged in
        setAuth({
          isAuthenticated: true,
          user: {
            id: data.user.id,
            fullName: profile.fullName || 'New User',
            dateOfBirth: profile.dateOfBirth || '',
            country: profile.country || '',
            hobbies: profile.hobbies || [],
            preferences: {},
            privacySettings: {
              shareLocation: false,
              sharePhone: false,
              sharePreferences: false,
              shareHobbies: false,
              shareName: false,
              shareCountry: false,
              shareDob: false
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          loading: false,
          error: null
        });
      }

      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: handleError(error)
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuth(prev => ({ ...prev, loading: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearSession();
      setAuth({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
      
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      setAuth(prev => ({
        ...prev,
        loading: false,
        error: handleError(error)
      }));
      throw error;
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}