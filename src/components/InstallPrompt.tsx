import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppUpdatePromptProps {
  onUpdate: () => void;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                              (window.navigator as any).standalone || 
                              document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);
    if (isInStandaloneMode) {
      return; // Don't show prompt if already installed
    }

    // Check if on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if user has visited before
    const lastVisit = localStorage.getItem('lastVisit');
    const now = Date.now();
    if (lastVisit) {
      // User has visited before - show prompt immediately
      setHasVisited(true);
    } else {
      // First visit - show prompt after 3 seconds
      setTimeout(() => {
        setHasVisited(true);
      }, 3000);
    }
    localStorage.setItem('lastVisit', now.toString());

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      promptEventRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
      
      if (!isInStandaloneMode) {
        if (hasVisited) {
          // Second visit - show immediately
          setShowPrompt(true);
        } else {
          // First visit - show after 3 seconds
          setTimeout(() => {
            setShowPrompt(true);
          }, 3000);
        }
      }
    };

    // Handle appinstalled event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      promptEventRef.current = null;
      setIsStandalone(true);
      localStorage.setItem('appInstalled', 'true');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show iOS instructions
    if (isIOSDevice && !localStorage.getItem('iosPromptShown')) {
      if (hasVisited) {
        // Second visit - show immediately
        setShowPrompt(true);
      } else {
        // First visit - show after 3 seconds
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [hasVisited]);

  const handleInstall = async () => {
    const prompt = deferredPrompt || promptEventRef.current;
    if (!prompt) {
      console.warn('No installation prompt available');
      return;
    }

    try {
      await prompt.prompt();
      const choiceResult = await prompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsStandalone(true);
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('installPromptDismissedAt', Date.now().toString());
      }

      setDeferredPrompt(null);
      promptEventRef.current = null;
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('iosPromptShown', 'true');
    } else {
      localStorage.setItem('installPromptDismissedAt', Date.now().toString());
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4 z-50 animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Install AI Verse</h3>
            {isIOS ? (
              <p className="text-sm text-gray-600">
                Tap <span className="inline-flex items-center px-1 py-0.5 bg-gray-100 text-gray-700 rounded">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </span> then "Add to Home Screen" for the best experience
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Install our app for a faster, more convenient experience
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isIOS && (deferredPrompt || promptEventRef.current) && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-5 h-5" />
              Install Now
            </button>
          )}
          <button
            onClick={dismissPrompt}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}