import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackAppBehavior } from './appTracking';
import { logger } from './logging';

// Navigation states
export type NavigationState = 
  | 'idle' 
  | 'warning' 
  | 'confirming' 
  | 'navigating' 
  | 'completed';

interface ExternalNavigation {
  currentState: NavigationState;
  targetUrl: string | null;
  appId: string | null;
  appName: string | null;
  storeName: string | null;
  recentlyVisited: Array<{
    url: string;
    appName: string;
    timestamp: number;
  }>;
  setState: (state: NavigationState) => void;
  startNavigation: (url: string, appId: string, appName: string, storeName: string) => void;
  confirmNavigation: () => Promise<void>;
  cancelNavigation: () => void;
  completeNavigation: () => void;
  resetState: () => void;
}

const MAX_RECENT_VISITS = 10;
const NAVIGATION_TIMEOUT = 1000; // 1 second

// Create store with persistence
export const useNavigationStore = create<ExternalNavigation>()(
  persist(
    (set, get) => ({
      currentState: 'idle',
      targetUrl: null,
      appId: null,
      appName: null,
      storeName: null,
      recentlyVisited: [],
      
      setState: (state) => set({ currentState: state }),
      
      startNavigation: (url, appId, appName, storeName) => {
        logger.info({
          url,
          appId,
          appName,
          storeName
        }, 'Starting external navigation');
        
        // Reset any existing navigation state first
        get().resetState();
        
        set({
          currentState: 'warning',
          targetUrl: url,
          appId,
          appName,
          storeName
        });

        // Set a timeout to reset state if navigation gets stuck
        setTimeout(() => {
          const currentState = get().currentState;
          if (currentState !== 'idle' && currentState !== 'completed') {
            logger.warn('Navigation timeout - resetting state');
            get().resetState();
          }
        }, NAVIGATION_TIMEOUT);
      },
      
      confirmNavigation: async () => {
        const state = get();
        if (!state.targetUrl || !state.appId) {
          logger.warn('Invalid navigation state: missing URL or app ID');
          return;
        }

        try {
          set({ currentState: 'confirming' });

          // Track the navigation event
          await trackAppBehavior({
            appId: state.appId,
            action: 'external_navigation_confirmed',
            category: 'usage',
            details: {
              url: state.targetUrl,
              store: state.storeName
            }
          });

          // Update recently visited
          const newVisit = {
            url: state.targetUrl,
            appName: state.appName!,
            timestamp: Date.now()
          };

          set(state => ({
            currentState: 'navigating',
            recentlyVisited: [
              newVisit,
              ...state.recentlyVisited.slice(0, MAX_RECENT_VISITS - 1)
            ]
          }));

          // Complete navigation
          get().completeNavigation();

        } catch (error) {
          logger.error({ error }, 'Navigation confirmation failed');
          
          // Reset state on error
          get().resetState();
          
          throw error instanceof Error ? error : new Error('Navigation failed');
        }
      },
      
      cancelNavigation: () => {
        const state = get();
        if (!state.appId) return;

        try {
          trackAppBehavior({
            appId: state.appId,
            action: 'external_navigation_cancelled',
            category: 'usage',
            details: {
              url: state.targetUrl,
              store: state.storeName
            }
          }).catch(error => {
            logger.error({ error }, 'Failed to track navigation cancellation');
          });
        } catch (error) {
          logger.error({ error }, 'Failed to track navigation cancellation');
        }

        get().resetState();
      },
      
      completeNavigation: () => {
        set({ currentState: 'completed' });
        
        // Reset state after a short delay
        setTimeout(() => {
          get().resetState();
        }, 1000);
      },
      
      resetState: () => {
        set({
          currentState: 'idle',
          targetUrl: null,
          appId: null,
          appName: null,
          storeName: null
        });
      }
    }),
    {
      name: 'navigation-store',
      partialize: (state) => ({
        currentState: state.currentState === 'completed' ? 'idle' : state.currentState,
        recentlyVisited: state.recentlyVisited
      })
    }
  )
);

// Initialize store with error handling
try {
  // Check for stuck state on load
  const state = useNavigationStore.getState();
  if (state.currentState !== 'idle' && state.currentState !== 'completed') {
    logger.warn('Detected stuck navigation state on load - resetting');
    useNavigationStore.getState().resetState();
  }
} catch (error) {
  logger.error({ error }, 'Failed to initialize navigation store');
  // Ensure we start in a clean state
  useNavigationStore.setState({
    currentState: 'idle',
    targetUrl: null,
    appId: null,
    appName: null,
    storeName: null,
    recentlyVisited: []
  });
}