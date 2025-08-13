// Performance monitoring and optimization utilities
export const measurePerformance = (name: string, fn: () => any) => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  // Log performance metrics
  console.debug(`Performance [${name}]: ${duration.toFixed(2)}ms`);
  
  // Report to analytics if duration is concerning
  if (duration > 100) {
    reportPerformanceIssue(name, duration);
  }
  
  return result;
};

// Report performance issues
const reportPerformanceIssue = (name: string, duration: number) => {
  console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number | undefined;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
};

// Throttle function for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Measure component render time
export const measureRender = (componentName: string) => {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    console.debug(`Render time [${componentName}]: ${duration.toFixed(2)}ms`);
  };
};

// Check if browser supports performance features
export const checkPerformanceSupport = () => {
  return {
    performanceAPI: typeof window !== 'undefined' && !!window.performance,
    requestIdleCallback: typeof window !== 'undefined' && 'requestIdleCallback' in window,
    requestAnimationFrame: typeof window !== 'undefined' && 'requestAnimationFrame' in window,
    deviceMemory: typeof navigator !== 'undefined' && 'deviceMemory' in navigator,
    hardwareConcurrency: typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator
  };
};

// Schedule non-critical work during idle time
export const scheduleIdleWork = (work: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => work());
  } else {
    setTimeout(work, 1);
  }
};

// Monitor memory usage
export const monitorMemory = async () => {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (usage > 0.9) {
      console.warn('High memory usage detected:', usage.toFixed(2));
      // Trigger garbage collection if needed
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
      }
    }
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  // Monitor long tasks
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', entry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('PerformanceObserver not supported or failed:', e);
    }
  }
  
  // Monitor memory periodically
  if (typeof window !== 'undefined') {
    setInterval(monitorMemory, 30000);
  }
  
  // Report initial conditions
  console.info('Performance conditions:', {
    ...checkPerformanceSupport(),
    connection: typeof navigator !== 'undefined' && (navigator as any).connection?.effectiveType || 'unknown',
    deviceMemory: typeof navigator !== 'undefined' && (navigator as any).deviceMemory || 'unknown',
    cores: typeof navigator !== 'undefined' && navigator.hardwareConcurrency || 'unknown'
  });
};