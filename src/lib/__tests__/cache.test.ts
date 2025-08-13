import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  clearAllCaches, 
  detectFaultedState, 
  markAsFaulted, 
  clearFaultedState,
  recoverFromFaultedState,
  cacheData,
  getCachedData,
  cachePage,
  getCachedPage,
  cacheAsset,
  getCachedAsset
} from '../cache';

describe('Cache Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Data Cache', () => {
    it('should cache and retrieve data', () => {
      const testData = { id: 1, name: 'test' };
      cacheData('test-key', testData);
      expect(getCachedData('test-key')).toEqual(testData);
    });

    it('should expire cached data after maxAge', () => {
      const testData = { id: 1, name: 'test' };
      cacheData('test-key', testData, 100); // 100ms expiry
      
      expect(getCachedData('test-key')).toEqual(testData);
      
      vi.advanceTimersByTime(150);
      expect(getCachedData('test-key')).toBeUndefined();
    });

    it('should handle undefined data gracefully', () => {
      expect(getCachedData('non-existent')).toBeUndefined();
    });
  });

  describe('Page Cache', () => {
    it('should cache and retrieve page data', () => {
      const pageData = { title: 'Test Page', content: 'Test Content' };
      cachePage('/test', pageData);
      expect(getCachedPage('/test')).toEqual(pageData);
    });

    it('should handle missing page data', () => {
      expect(getCachedPage('/non-existent')).toBeUndefined();
    });
  });

  describe('Asset Cache', () => {
    it('should cache and retrieve assets', () => {
      const assetUrl = 'https://example.com/image.jpg';
      const assetData = 'test-asset-data';
      cacheAsset(assetUrl, assetData);
      expect(getCachedAsset(assetUrl)).toBe(assetData);
    });

    it('should handle missing assets', () => {
      expect(getCachedAsset('non-existent')).toBeUndefined();
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all caches', () => {
      // Setup test data
      cacheData('test-key', 'test-data');
      cachePage('/test', 'test-page');
      cacheAsset('test-url', 'test-asset');
      
      // Mock service worker and caches
      const mockServiceWorker = {
        ready: Promise.resolve({
          active: {
            postMessage: vi.fn()
          }
        })
      };
      
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: vi.fn().mockResolvedValue(undefined)
      };
      
      // @ts-ignore - mock navigator and caches
      global.navigator.serviceWorker = mockServiceWorker;
      // @ts-ignore - mock caches
      global.caches = mockCaches;
      
      // Verify data is cached
      expect(getCachedData('test-key')).toBeDefined();
      expect(getCachedPage('/test')).toBeDefined();
      expect(getCachedAsset('test-url')).toBeDefined();
      
      // Clear caches
      clearAllCaches();
      
      // Verify all caches are cleared
      expect(getCachedData('test-key')).toBeUndefined();
      expect(getCachedPage('/test')).toBeUndefined();
      expect(getCachedAsset('test-url')).toBeUndefined();
    });

    it('should handle clearing empty caches', () => {
      expect(() => clearAllCaches()).not.toThrow();
    });
  });

  describe('Fault State Management', () => {
    it('should detect and clear faulted state', () => {
      expect(detectFaultedState()).toBe(false);
      
      markAsFaulted();
      expect(detectFaultedState()).toBe(true);
      
      clearFaultedState();
      expect(detectFaultedState()).toBe(false);
    });

    it('should recover from faulted state', () => {
      markAsFaulted();
      expect(detectFaultedState()).toBe(true);
      
      const recovered = recoverFromFaultedState();
      expect(recovered).toBe(true);
      expect(detectFaultedState()).toBe(false);
    });

    it('should handle recovery when not faulted', () => {
      clearFaultedState();
      const recovered = recoverFromFaultedState();
      expect(recovered).toBe(false);
      expect(detectFaultedState()).toBe(false);
    });
  });
});