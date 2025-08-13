import { create } from 'zustand';

// Error types
export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error store
interface ErrorState {
  lastError: {
    timestamp: number;
    message: string;
    path: string;
    type: string;
  } | null;
  setLastError: (error: Error, path: string) => void;
  clearLastError: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  lastError: null,
  setLastError: (error: Error, path: string) => set({
    lastError: {
      timestamp: Date.now(),
      message: error.message,
      path,
      type: error.name
    }
  }),
  clearLastError: () => set({ lastError: null })
}));

// Error handling utilities
export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    // Handle specific error types
    if (error instanceof SessionError) {
      useErrorStore.getState().setLastError(error, window.location.pathname);
      return 'Your session has expired. Please log in again.';
    }
    if (error instanceof NetworkError) {
      useErrorStore.getState().setLastError(error, window.location.pathname);
      return 'Network connection error. Please check your connection and try again.';
    }
    if (error instanceof DatabaseError) {
      useErrorStore.getState().setLastError(error, window.location.pathname);
      return 'Database error occurred. Please try again.';
    }
    
    // Log generic error
    useErrorStore.getState().setLastError(error, window.location.pathname);
    return error.message;
  }
  
  // Handle unknown errors
  const message = 'An unexpected error occurred';
  useErrorStore.getState().setLastError(new Error(message), window.location.pathname);
  return message;
};

export const isSessionError = (error: unknown): boolean => {
  return error instanceof SessionError || 
    (error instanceof Error && error.message.toLowerCase().includes('session'));
};

export const isNetworkError = (error: unknown): boolean => {
  return error instanceof NetworkError ||
    (error instanceof Error && (
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed')
    ));
};

export const isDatabaseError = (error: unknown): boolean => {
  return error instanceof DatabaseError ||
    (error instanceof Error && (
      error.message.includes('database') ||
      error.message.includes('PGRST')
    ));
};

export const formatErrorForLogging = (error: unknown): Record<string, any> => {
  const baseError = {
    timestamp: new Date().toISOString(),
    type: error instanceof Error ? error.name : 'Unknown',
    path: window.location.pathname
  };

  if (error instanceof Error) {
    return {
      ...baseError,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    ...baseError,
    message: String(error)
  };
};

// Recovery helper
export const shouldAttemptRecovery = (error: unknown): boolean => {
  return isSessionError(error) || isNetworkError(error) || isDatabaseError(error);
};