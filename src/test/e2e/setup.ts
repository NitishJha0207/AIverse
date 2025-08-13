import '@testing-library/jest-dom/vitest';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';
import { mockSupabase, resetMocks } from '../mocks/supabase';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  resetMocks();
  vi.clearAllMocks();
});