import { vi } from 'vitest';

export const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    setSession: vi.fn(),
    refreshSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }))
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn()
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'test-url' } })
    }))
  }
};

export const resetMocks = () => {
  Object.values(mockSupabase.auth).forEach(mock => mock.mockReset());
  Object.values(mockSupabase.from()).forEach(mock => mock.mockReset());
  Object.values(mockSupabase.storage.from()).forEach(mock => mock.mockReset());
};

// Helper to mock successful responses
export const mockSuccessResponse = (data: any) => ({
  data,
  error: null
});

// Helper to mock error responses
export const mockErrorResponse = (message: string, code?: string) => ({
  data: null,
  error: { message, code }
});

// Mock Supabase in tests
vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));