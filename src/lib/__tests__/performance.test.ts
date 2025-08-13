import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  measurePerformance,
  debounce,
  throttle,
  measureRender,
  checkPerformanceSupport,
  scheduleIdleWork,
  monitorMemory,
  initPerformanceMonitoring
} from '../performance';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('measurePerformance', () => {
    it('should measure function execution time', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const testFn = () => {
        vi.advanceTimersByTime(100);
        return 'result';
      };

      const result = measurePerformance('test', testFn);
      
      expect(result).toBe('result');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance [test]'));
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('measureRender', () => {
    it('should measure component render time', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const cleanup = measureRender('TestComponent');
      
      vi.advanceTimersByTime(50);
      cleanup();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Render time [TestComponent]'));
    });
  });

  describe('Performance Support', () => {
    it('should check browser performance support', () => {
      // Mock window and navigator
      global.window = {
        performance: {},
        requestIdleCallback: vi.fn(),
        requestAnimationFrame: vi.fn()
      } as any;
      
      global.navigator = {
        deviceMemory: 8,
        hardwareConcurrency: 4
      } as any;
      
      const support = checkPerformanceSupport();
      
      expect(support).toHaveProperty('performanceAPI');
      expect(support).toHaveProperty('requestIdleCallback');
      expect(support).toHaveProperty('requestAnimationFrame');
      expect(support).toHaveProperty('deviceMemory');
      expect(support).toHaveProperty('hardwareConcurrency');
    });
  });

  describe('Idle Work Scheduling', () => {
    it('should schedule work during idle time', () => {
      const work = vi.fn();
      
      // Mock requestIdleCallback
      global.window = {
        requestIdleCallback: (callback: any) => {
          callback();
          return 1;
        }
      } as any;
      
      scheduleIdleWork(work);
      expect(work).toHaveBeenCalled();
      
      // Test fallback to setTimeout
      global.window = {} as any;
      work.mockClear();
      scheduleIdleWork(work);
      vi.advanceTimersByTime(1);
      expect(work).toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    it('should monitor memory usage', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock performance.memory
      global.performance = {
        memory: {
          jsHeapSizeLimit: 2147483648,
          totalJSHeapSize: 1147483648,
          usedJSHeapSize: 2047483648 // High usage to trigger warning
        }
      } as any;
      
      await monitorMemory();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('High memory usage detected:'));
    });
  });

  describe('Performance Monitoring Initialization', () => {
    it('should initialize performance monitoring', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      // Mock PerformanceObserver
      global.PerformanceObserver = class {
        constructor(callback: any) {
          this.callback = callback;
        }
        observe() {}
        disconnect() {}
        callback: any;
      } as any;
      
      // Mock navigator
      global.navigator = {
        connection: { effectiveType: '4g' },
        deviceMemory: 8,
        hardwareConcurrency: 4
      } as any;
      
      initPerformanceMonitoring();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance conditions:',
        expect.objectContaining({
          performanceAPI: expect.any(Boolean),
          requestIdleCallback: expect.any(Boolean),
          requestAnimationFrame: expect.any(Boolean)
        })
      );
    });
  });
});