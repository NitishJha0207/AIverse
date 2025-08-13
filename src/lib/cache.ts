import { logger } from './logging';

// Cache version to invalidate all caches when needed
const CACHE_VERSION = '1.0.1';
const CACHE_KEY_PREFIX = 'aiverse';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const CACHE_SIZE_LIMIT = 100; // Maximum number of items in each cache

// LRU Cache implementation
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if item has expired
    if (Date.now() - item.timestamp > CACHE_MAX_AGE) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to front (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: K): void {
    this.cache.delete(key);
  }
}

// Create cache instances
export const pageCache = new LRUCache<string, any>(50);
export const dataCache = new LRUCache<string, any>(100);
export const assetCache = new LRUCache<string, string>(30);
export const appCache = new LRUCache<string, any>(50);

// Clear all app caches
export const clearAllCaches = () => {
  try {
    // Clear memory caches
    pageCache.clear();
    dataCache.clear();
    assetCache.clear();
    appCache.clear();

    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear service worker cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'INVALIDATE_CACHE'
        });
      }).catch(err => {
        console.error('Error clearing service worker cache:', err);
      });
    }

    // Clear browser cache if possible
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name).catch(err => {
            console.error('Error clearing cache:', err);
          });
        });
      }).catch(err => {
        console.error('Error clearing caches:', err);
      });
    }

    logger.info('All caches cleared successfully');
  } catch (error) {
    logger.error('Failed to clear caches:', error);
  }
};

// Cache helpers with automatic invalidation
export const cacheData = (key: string, data: any, maxAge?: number) => {
  const cacheKey = `${CACHE_VERSION}:${key}`;
  dataCache.set(cacheKey, data);
  if (maxAge) {
    setTimeout(() => dataCache.delete(cacheKey), maxAge);
  }
};

export const getCachedData = (key: string) => {
  const cacheKey = `${CACHE_VERSION}:${key}`;
  return dataCache.get(cacheKey);
};

export const cachePage = (path: string, data: any) => {
  const cacheKey = `${CACHE_VERSION}:${path}`;
  pageCache.set(cacheKey, data);
};

export const getCachedPage = (path: string) => {
  const cacheKey = `${CACHE_VERSION}:${path}`;
  return pageCache.get(cacheKey);
};

export const cacheAsset = (url: string, data: string) => {
  const cacheKey = `${CACHE_VERSION}:${url}`;
  assetCache.set(cacheKey, data);
};

export const getCachedAsset = (url: string) => {
  const cacheKey = `${CACHE_VERSION}:${url}`;
  return assetCache.get(cacheKey);
};

export const cacheApp = (id: string, data: any) => {
  const cacheKey = `${CACHE_VERSION}:${id}`;
  appCache.set(cacheKey, data);
};

export const getCachedApp = (id: string) => {
  const cacheKey = `${CACHE_VERSION}:${id}`;
  return appCache.get(cacheKey);
};

export const clearAppCache = () => {
  appCache.clear();
  logger.info('App cache cleared');
};

// Fault state management
const FAULT_KEY = `${CACHE_KEY_PREFIX}_faulted`;

export const markAsFaulted = () => {
  localStorage.setItem(FAULT_KEY, 'true');
};

export const clearFaultedState = () => {
  localStorage.removeItem(FAULT_KEY);
};

export const detectFaultedState = (): boolean => {
  return localStorage.getItem(FAULT_KEY) === 'true';
};

export const recoverFromFaultedState = (): boolean => {
  if (!detectFaultedState()) return false;
  
  try {
    clearAllCaches();
    clearFaultedState();
    return true;
  } catch (error) {
    logger.error('Failed to recover from faulted state:', error);
    return false;
  }
};

// Function to force reload page
export const forcePageReload = () => {
  clearAllCaches();
  window.location.reload();
};