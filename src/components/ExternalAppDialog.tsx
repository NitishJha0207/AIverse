import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, ExternalLink, X, Activity } from 'lucide-react';
import { AppListing } from '../types';
import { useNavigationStore } from '../lib/navigationStateMachine';
import { LoadingSpinner } from './LoadingSpinner';
import { logger } from '../lib/logging';

interface ExternalAppDialogProps {
  app: AppListing;
  onClose: () => void;
}

export function ExternalAppDialog({ app, onClose }: ExternalAppDialogProps) {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const navigationStore = useNavigationStore();
  const { currentState } = navigationStore;
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset navigation state when dialog closes
  useEffect(() => {
    return () => {
      if (currentState !== 'completed') {
        navigationStore.resetState();
      }
    };
  }, [currentState]);

  // Close dialog when navigation completes
  useEffect(() => {
    if (currentState === 'completed') {
      onClose();
    }
  }, [currentState, onClose]);

  const handleContinue = async () => {
    if (!app.store_url || app.store_url === '#') {
      onClose();
      return;
    }

    try {
      setError(null);
      setIsNavigating(true);
      
      // Start navigation if not already started
      if (currentState === 'idle') {
        navigationStore.startNavigation(
          app.store_url,
          app.id,
          app.name,
          app.original_store || 'External Store'
        );
      }

      // Try to open in new window
      const windowFeatures = 'noopener=yes,noreferrer=yes,width=1024,height=768';
      const newWindow = window.open(app.store_url, '_blank', windowFeatures);
      
      if (!newWindow || newWindow.closed) {
        throw new Error('Popup blocked');
      }

      // Confirm navigation
      await navigationStore.confirmNavigation();
      
      // Close dialog after successful navigation
      onClose();

      logger.info({
        appId: app.id,
        store: app.original_store,
        url: app.store_url
      }, 'External navigation successful');

    } catch (error) {
      logger.error({ 
        error,
        appId: app.id,
        store: app.original_store,
        url: app.store_url
      }, 'Navigation failed');

      setError(
        error instanceof Error && error.message === 'Popup blocked'
          ? 'Please allow popups to open the external store in a new tab'
          : 'Failed to open external store. Please try again'
      );

      // Reset navigation state
      navigationStore.resetState();
    } finally {
      setIsNavigating(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setIsNavigating(false);
    navigationStore.cancelNavigation();
    onClose();
  };

  const isLoading = isNavigating || currentState === 'confirming' || currentState === 'navigating';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancel}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <h2 className="text-xl font-semibold">External App Installation</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              You are about to leave AIVerse and install <strong>{app.name}</strong> from {app.original_store || 'an external store'}. 
              While we've verified this app's legitimacy, please be aware that:
            </p>
            <ul className="mt-2 space-y-1 text-yellow-700 text-sm">
              <li>• The app will be installed outside of AIVerse's secure environment</li>
              <li>• Our security features will have limited effectiveness</li>
              <li>• The app will be subject to the external store's policies</li>
            </ul>
          </div>

          {/* Security Recommendations */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Security Recommendations
            </h3>
            <div className="space-y-3 text-gray-600">
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                Review the app's permissions carefully during installation
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                Enable AIVerse's external app tracking for security monitoring
              </p>
              <p className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                Consider using app isolation features in your device settings
              </p>
            </div>
          </div>

          {/* Tracking Setup */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={trackingEnabled}
                onChange={(e) => setTrackingEnabled(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  Enable Security Tracking
                  <Activity className="w-4 h-4 text-blue-600" />
                </p>
                <p className="text-sm text-gray-600">
                  Allow AIVerse to monitor this app's behavior and alert you of potential security risks.
                  This helps us provide better security recommendations.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open('/privacy-policy', '_blank', 'noopener,noreferrer');
                  }}
                  className="text-sm text-blue-600 hover:underline mt-1"
                >
                  Learn more about our tracking policy
                </button>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={isLoading || !app.store_url || app.store_url === '#'}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Opening in new tab...</span>
              </>
            ) : (
              <>
                Continue to {app.original_store || 'External Store'}
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}