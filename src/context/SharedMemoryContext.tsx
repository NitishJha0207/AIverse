import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { User, AIApp, Permission } from '../types';
import { supabase } from '../lib/supabase';
import { handleError } from '../lib/errors';

interface SharedMemoryState {
  user: User | null;
  installedApps: AIApp[];
  preferences: Record<string, any>;
  history: {
    timestamp: number;
    action: string;
    details: Record<string, any>;
  }[];
  permissions: Record<string, Permission[]>;
  error: string | null;
}

type Action = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'UPDATE_PREFERENCES'; payload: Record<string, any> }
  | { type: 'ADD_HISTORY_ENTRY'; payload: { action: string; details: Record<string, any> } }
  | { type: 'UPDATE_PERMISSIONS'; payload: { appId: string; permissions: Permission[] } }
  | { type: 'INSTALL_APP'; payload: AIApp }
  | { type: 'UNINSTALL_APP'; payload: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: SharedMemoryState = {
  user: null,
  installedApps: [],
  preferences: {
    theme: 'light',
    notifications: true,
    shared_memory: {
      enabled: false,
      storageQuota: 1024,
      retentionPeriod: 90,
      autoSync: true,
      syncInterval: 60,
      dataCategories: {
        actions: true,
        preferences: true,
        history: true,
        userContent: false
      },
      accessControl: {
        allowedApps: [],
        blockedApps: [],
        dataSharing: 'selected',
        requireConsent: true
      }
    }
  },
  history: [],
  permissions: {},
  error: null
};

function sharedMemoryReducer(state: SharedMemoryState, action: Action): SharedMemoryState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'UPDATE_PREFERENCES':
      return { 
        ...state, 
        preferences: { 
          ...state.preferences, 
          ...action.payload,
          shared_memory: {
            ...state.preferences.shared_memory,
            ...(action.payload.shared_memory || {})
          }
        } 
      };
    case 'ADD_HISTORY_ENTRY':
      const newHistory = [
        {
          timestamp: Date.now(),
          action: action.payload.action,
          details: action.payload.details,
        },
        ...state.history,
      ].slice(0, 1000);

      if (state.user) {
        logSharedMemoryAction({
          userId: state.user.id,
          appId: action.payload.details.appId,
          category: 'user_action',
          action: action.payload.action,
          payload: action.payload.details,
          metadata: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }).catch(error => {
          console.error('Failed to log action:', handleError(error));
        });
      }

      return { ...state, history: newHistory };
    case 'UPDATE_PERMISSIONS':
      return {
        ...state,
        permissions: {
          ...state.permissions,
          [action.payload.appId]: action.payload.permissions,
        },
      };
    case 'INSTALL_APP':
      return {
        ...state,
        installedApps: [...state.installedApps, action.payload],
      };
    case 'UNINSTALL_APP':
      return {
        ...state,
        installedApps: state.installedApps.filter(app => app.id !== action.payload),
        permissions: Object.fromEntries(
          Object.entries(state.permissions).filter(([key]) => key !== action.payload)
        ),
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: []
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    default:
      return state;
  }
}

const SharedMemoryContext = createContext<{
  state: SharedMemoryState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Memory cache
const memoryCache = new Map<string, any>();

export function SharedMemoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(sharedMemoryReducer, initialState);
  const mountedRef = useRef(true);
  const syncTimeoutRef = useRef<number>();

  useEffect(() => {
    let mounted = true;

    const initializeSharedMemory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted || !session?.user) return;

        // Fetch user profile first
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!mounted) return;
        
        if (profileError) {
          dispatch({ type: 'SET_ERROR', payload: handleError(profileError) });
          return;
        }

        if (userProfile) {
          dispatch({ type: 'SET_USER', payload: {
            id: userProfile.id,
            ...userProfile
          }});

          // Update preferences with stored values
          if (userProfile.preferences) {
            dispatch({ 
              type: 'UPDATE_PREFERENCES', 
              payload: {
                ...userProfile.preferences,
                shared_memory: {
                  ...initialState.preferences.shared_memory,
                  ...userProfile.preferences.shared_memory
                }
              }
            });
          }

          // Then fetch installed apps
          const { data: installations, error: installError } = await supabase
            .from('app_installations')
            .select(`
              *,
              app:apps(*)
            `)
            .eq('user_id', session.user.id)
            .eq('status', 'active');

          if (!mounted) return;

          if (installError) {
            dispatch({ type: 'SET_ERROR', payload: handleError(installError) });
            return;
          }

          if (installations) {
            installations.forEach(installation => {
              if (installation.app) {
                dispatch({ type: 'INSTALL_APP', payload: installation.app });
                dispatch({
                  type: 'UPDATE_PERMISSIONS',
                  payload: {
                    appId: installation.app_id,
                    permissions: installation.granted_permissions || []
                  }
                });
              }
            });
          }
        }
      } catch (error) {
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: handleError(error) });
        }
      }
    };

    initializeSharedMemory();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: userProfile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (mounted) {
            if (error) {
              dispatch({ type: 'SET_ERROR', payload: handleError(error) });
            } else if (userProfile) {
              dispatch({ type: 'SET_USER', payload: userProfile });
              
              // Update preferences with stored values
              if (userProfile.preferences) {
                dispatch({ 
                  type: 'UPDATE_PREFERENCES', 
                  payload: {
                    ...userProfile.preferences,
                    shared_memory: {
                      ...initialState.preferences.shared_memory,
                      ...userProfile.preferences.shared_memory
                    }
                  }
                });
              }
              
              memoryCache.set(`profile:${session.user.id}`, userProfile);
            }
          }
        } else if (event === 'SIGNED_OUT' && mounted) {
          dispatch({ type: 'SET_USER', payload: null });
          // Reset preferences to defaults
          dispatch({ type: 'UPDATE_PREFERENCES', payload: initialState.preferences });
          // Clear user-specific cache
          Array.from(memoryCache.keys())
            .filter(key => key.startsWith('profile:'))
            .forEach(key => memoryCache.delete(key));
        }
      } catch (error) {
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: handleError(error) });
        }
      }
    });

    return () => {
      mounted = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Debounced preference sync
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    if (state.user) {
      syncTimeoutRef.current = window.setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('user_profiles')
            .update({
              preferences: state.preferences,
              updated_at: new Date().toISOString()
            })
            .eq('id', state.user.id);

          if (error && mountedRef.current) {
            dispatch({ type: 'SET_ERROR', payload: handleError(error) });
          }
        } catch (error) {
          if (mountedRef.current) {
            dispatch({ type: 'SET_ERROR', payload: handleError(error) });
          }
        }
      }, 1000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state.preferences, state.user]);

  return (
    <SharedMemoryContext.Provider value={{ state, dispatch }}>
      {children}
    </SharedMemoryContext.Provider>
  );
}

export function useSharedMemory() {
  const context = useContext(SharedMemoryContext);
  if (!context) {
    throw new Error('useSharedMemory must be used within a SharedMemoryProvider');
  }
  return context;
}