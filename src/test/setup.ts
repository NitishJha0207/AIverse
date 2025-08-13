import '@testing-library/jest-dom/vitest';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock window.crypto for tests
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockImplementation(async () => {
        const buffer = new ArrayBuffer(32);
        const array = new Uint8Array(buffer);
        array.fill(1); // Fill with predictable value for tests
        return buffer;
      })
    },
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000')
  }
});

// Mock requestIdleCallback and cancelIdleCallback
window.requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
window.cancelIdleCallback = window.cancelIdleCallback || ((id) => clearTimeout(id));

// Mock PerformanceObserver
class MockPerformanceObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
  callback: any;
}

window.PerformanceObserver = window.PerformanceObserver || MockPerformanceObserver;

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    jsHeapSizeLimit: 2147483648,
    totalJSHeapSize: 1147483648,
    usedJSHeapSize: 747483648
  },
  configurable: true
});

// Mock URL constructor for tests
global.URL = class {
  constructor(url: string) {
    if (!url.startsWith('http')) {
      throw new Error('Invalid URL');
    }
  }
} as any;

// Mock File API
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(bits: Array<any>, name: string, options: any = {}) {
    this.name = name;
    this.size = bits.reduce((acc, bit) => acc + (bit.length || bit.size || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
} as any;

// Mock Blob API
global.Blob = class MockBlob {
  size: number;
  type: string;

  constructor(bits: Array<any>, options: any = {}) {
    this.size = bits.reduce((acc, bit) => acc + (bit.length || bit.size || 0), 0);
    this.type = options.type || '';
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});