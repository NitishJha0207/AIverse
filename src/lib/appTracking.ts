import { supabase } from './supabase';
import { logger } from './logging';
import { cacheData, getCachedData } from './cache';

export interface AppBehavior {
  appId: string;
  action: string;
  details: Record<string, any>;
  category: 'security' | 'performance' | 'usage' | 'permissions';
}

const trackingLogger = logger.child({ component: 'appTracking' });
const LOGS_CACHE_KEY = 'app_behavior_logs';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LOGS_LIMIT = 50; // Limit number of logs per request

export async function trackAppBehavior(behavior: AppBehavior) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      trackingLogger.warn('No authenticated user found for tracking');
      return;
    }

    // Use the database function to log the action
    const { error } = await supabase.rpc('log_shared_memory_action', {
      p_user_id: user.id,
      p_app_id: behavior.appId,
      p_category: behavior.category,
      p_action: behavior.action,
      p_details: behavior.details,
      p_metadata: {
        platform: 'web',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.pathname
      }
    });

    if (error) throw error;

    // Clear cache for this app's logs
    cacheData(`${LOGS_CACHE_KEY}_${behavior.appId}`, null);

    trackingLogger.info({ 
      behavior,
      userId: user.id 
    }, `Tracked app behavior: ${behavior.action}`);

  } catch (error) {
    trackingLogger.error({ 
      error,
      behavior 
    }, 'Failed to track app behavior');
    console.error('App tracking error:', error);
  }
}

export async function getAppBehaviorLogs(appId: string, forceRefresh = false) {
  const cacheKey = `${LOGS_CACHE_KEY}_${appId}`;
  
  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedLogs = getCachedData(cacheKey);
      if (cachedLogs) {
        trackingLogger.debug({ appId }, 'Returning cached behavior logs');
        return cachedLogs;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      trackingLogger.warn('No authenticated user found for log retrieval');
      return [];
    }

    // Set timeout for the request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    // Fetch logs with timeout
    const fetchPromise = supabase
      .from('shared_memory_logs')
      .select('*')
      .eq('app_id', appId)
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(LOGS_LIMIT);

    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]) as any;

    if (error) {
      trackingLogger.error({ 
        error,
        appId,
        userId: user.id
      }, 'Failed to fetch app behavior logs');
      throw error;
    }

    const logs = data || [];

    // Cache the results
    cacheData(cacheKey, logs, CACHE_DURATION);

    trackingLogger.info({
      appId,
      userId: user.id,
      logCount: logs.length
    }, 'Successfully retrieved app behavior logs');

    return logs;
  } catch (error) {
    trackingLogger.error({ 
      error,
      appId 
    }, 'Failed to get app behavior logs');

    // If timeout or network error, return cached data if available
    if (error instanceof Error && 
        (error.message === 'Request timeout' || 
         error.message.includes('network'))) {
      const cachedLogs = getCachedData(cacheKey);
      if (cachedLogs) {
        trackingLogger.info({ appId }, 'Returning cached logs after fetch failure');
        return cachedLogs;
      }
    }

    return []; // Return empty array as fallback
  }
}