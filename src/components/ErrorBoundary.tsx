import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { clearAllCaches } from '../lib/cache';
import { useSessionStore } from '../lib/session';
import { shouldAttemptRecovery } from '../lib/errors';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
}

const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_COOLDOWN = 5000; // 5 seconds

export class ErrorBoundary extends Component<Props, State> {
  private lastRecoveryTime: number = 0;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRecovering: false,
    recoveryAttempts: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught error:', error, errorInfo);
    
    // Store error in session store
    const sessionStore = useSessionStore.getState();
    sessionStore.setLastError({
      message: error.message,
      path: window.location.pathname
    });
  }

  private canAttemptRecovery(): boolean {
    const now = Date.now();
    if (
      this.state.recoveryAttempts < MAX_RECOVERY_ATTEMPTS &&
      now - this.lastRecoveryTime >= RECOVERY_COOLDOWN &&
      this.state.error &&
      shouldAttemptRecovery(this.state.error)
    ) {
      this.lastRecoveryTime = now;
      return true;
    }
    return false;
  }

  private handleRetry = async () => {
    if (!this.canAttemptRecovery()) {
      return;
    }

    this.setState(prev => ({
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));
    
    try {
      // Clear caches
      clearAllCaches();
      
      // Attempt session recovery
      const sessionStore = useSessionStore.getState();
      await sessionStore.setLoading(true);
      
      const recovered = await import('../lib/session').then(m => m.attemptRecovery());
      
      if (recovered) {
        // Reset error state
        this.setState({ 
          hasError: false, 
          error: null, 
          errorInfo: null,
          isRecovering: false
        });

        // Clear last error from store
        sessionStore.clearLastError();
        
        // Reload the page to fresh start
        window.location.reload();
      } else {
        throw new Error('Recovery failed');
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      this.setState({ 
        isRecovering: false,
        error: error instanceof Error ? error : new Error('Recovery failed')
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      const showFullError = process.env.NODE_ENV === 'development';
      const isMaxAttemptsReached = this.state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS;
      const canRecover = this.state.error && shouldAttemptRecovery(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {isMaxAttemptsReached ? 'Unable to Recover' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isMaxAttemptsReached
                ? 'We\'ve tried multiple times to recover but were unsuccessful. Please try again later.'
                : this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="space-y-4">
              {!isMaxAttemptsReached && canRecover && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRecovering}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {this.state.isRecovering ? (
                    <>
                      <LoadingSpinner size="small" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4" />
                      Try Again
                    </>
                  )}
                </button>
              )}
              
              <Link
                to="/"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </Link>

              {showFullError && this.state.errorInfo && (
                <details className="text-left mt-4">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded-lg overflow-auto text-xs text-gray-800">
                    {this.state.error?.stack}
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <React.Suspense 
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <LoadingSpinner size="large" message="Loading..." />
          </div>
        }
      >
        {this.props.children}
      </React.Suspense>
    );
  }
}