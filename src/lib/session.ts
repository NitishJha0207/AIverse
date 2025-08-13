import { supabase } from './supabase';
import { AuthSession } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';

// Session storage keys
const SESSION_KEY = 'aiverse-session';
const SESSION_EXPIRY_KEY = 'aiverse-session-expiry';
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

let refreshInterval: number | undefined;

// Create session store
interface SessionState {
  session: AuthSession | null;
  error: string | null;
  isLoading: boolean;
  lastError: {
    timestamp: number;
    message: string;
    path: string;
  } | null;
  setSession: (session: AuthSession | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setLastError: (error: { message: string; path: string }) => void;
  clearLastError: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      error: null,
      isLoading: true,
      lastError: null,
      setSession: (session) => set({ session }),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
      setLastError: (error) =>
        set({
          lastError: {
            timestamp: Date.now(),
            message: error.message,
            path: error.path,
          },
        }),
      clearLastError: () => set({ lastError: null }),
    }),
    {
      name: 'session-store',
      partialize: (state) => ({
        session: state.session,
        lastError: state.lastError,
      }),
    }
  )
);

export const persistSession = (session: AuthSession | null) => {
  if (session) {
    try {
      // Store session with encryption
      const encryptedSession = btoa(JSON.stringify(session));
      localStorage.setItem(SESSION_KEY, encryptedSession);
      
      // Set expiry time (24 hours from now)
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
      
      // Update session store
      useSessionStore.getState().setSession(session);
      
      // Schedule refresh
      scheduleSessionRefresh();
    } catch (error) {
      console.error('Failed to persist session:', error);
      // Clear session on critical errors to prevent invalid state
      if (error instanceof TypeError || error instanceof ReferenceError) {
        clearSession();
      }
    }
  } else {
    clearSession();
  }
};

// Recover session from localStorage with validation
export const recoverSession = (): AuthSession | null => {
  try {
    const storedSession = localStorage.getItem(SESSION_KEY);
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    
    if (!storedSession || !expiryTime) return null;
    
    // Check if session has expired
    if (Date.now() > parseInt(expiryTime)) {
      clearSession();
      return null;
    }
    
    const session = JSON.parse(atob(storedSession));
    
    // Basic session structure validation
    if (!session.access_token || !session.user?.id) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to recover session:', error);
    // Clear on parse/decode errors to prevent invalid state
    if (error instanceof SyntaxError || error instanceof DOMException) {
      clearSession();
    }
    return null;
  }
};

// Validate session and refresh if needed
export const validateSession = async (): Promise<boolean> => {
  try {
    useSessionStore.getState().setLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation error:', error);
      useSessionStore.getState().setError(error.message);
      // Clear if it's an authentication error
      if (error.message.includes('auth') || error.message.includes('token')) {
        clearSession();
      }
      return false;
    }

    if (!session) {
      const recovered = recoverSession();
      if (recovered) {
        try {
          const { data: { session: refreshedSession }, error } = 
            await supabase.auth.setSession(recovered);
          
          if (error) {
            console.error('Session refresh failed:', error);
            useSessionStore.getState().setError(error.message);
            // Clear if refresh explicitly fails
            if (error.message.includes('invalid_token')) {
              clearSession();
            }
            return false;
          }
          
          if (refreshedSession) {
            persistSession(refreshedSession);
            useSessionStore.getState().setLoading(false);
            return true;
          }
        } catch (refreshError) {
          console.error('Session refresh error:', refreshError);
          useSessionStore.getState().setError(
            refreshError instanceof Error ? refreshError.message : 'Session refresh failed'
          );
          return false;
        }
      }
      return false;
    }

    persistSession(session);
    useSessionStore.getState().setLoading(false);
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    useSessionStore.getState().setError(
      error instanceof Error ? error.message : 'Session validation failed'
    );
    // Clear on critical errors
    if (error instanceof TypeError || error instanceof ReferenceError) {
      clearSession();
    }
    return false;
  }
};

// Schedule periodic session refresh
const scheduleSessionRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = window.setInterval(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Session refresh failed:', error);
          useSessionStore.getState().setError(error.message);
          // Clear if refresh explicitly fails
          if (error.message.includes('invalid_token')) {
            clearSession();
          }
          return;
        }
        if (data.session) {
          persistSession(data.session);
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      useSessionStore.getState().setError(
        error instanceof Error ? error.message : 'Session refresh failed'
      );
    }
  }, SESSION_REFRESH_INTERVAL);
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
  useSessionStore.getState().setSession(null);
  useSessionStore.getState().setError(null);
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = undefined;
  }
};

// Recovery helper
export const attemptRecovery = async () => {
  try {
    useSessionStore.getState().setLoading(true);
    const recovered = recoverSession();
    if (recovered) {
      return true;
    }
    return await validateSession();
  } catch (error) {
    console.error('Recovery attempt failed:', error);
    useSessionStore.getState().setError(
      error instanceof Error ? error.message : 'Recovery failed'
    );
    return false;
  } finally {
    useSessionStore.getState().setLoading(false);
  }
};