import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { EnterpriseProvider, useEnterprise } from '../../context/EnterpriseContext';
import { supabase } from '../../lib/supabase';
import { LicenseTier } from '../../types';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    })),
    rpc: vi.fn()
  }
}));

// Mock useAuth hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    auth: {
      isAuthenticated: true,
      user: { id: 'test-user-id' },
      loading: false
    }
  })
}));

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/enterprise/dashboard' })
}));

describe('EnterpriseContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', async () => {
    // Mock getUserOrganization response
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: 'test-org-id',
      error: null
    });

    // Mock organization data
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-org-id',
              name: 'Test Org',
              domain: 'test.com',
              admin_user_id: 'test-user-id',
              license_id: 'test-license-id'
            },
            error: null
          })
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any;
    });

    // Mock checkEnterpriseAccess
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EnterpriseProvider>{children}</EnterpriseProvider>
    );

    const { result } = renderHook(() => useEnterprise(), { wrapper });

    // Initial state should be loading
    expect(result.current.loading).toBe(true);

    // Wait for async operations
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check final state
    expect(result.current.organization).toBeDefined();
    expect(result.current.organization?.name).toBe('Test Org');
  });

  it('should handle organization refresh', async () => {
    // Mock getUserOrganization response
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: 'test-org-id',
      error: null
    });

    // Mock organization data
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-org-id',
              name: 'Test Org',
              domain: 'test.com',
              admin_user_id: 'test-user-id',
              license_id: 'test-license-id'
            },
            error: null
          })
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any;
    });

    // Mock checkEnterpriseAccess
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EnterpriseProvider>{children}</EnterpriseProvider>
    );

    const { result } = renderHook(() => useEnterprise(), { wrapper });

    // Wait for initial load
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup mocks for refresh
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: 'test-org-id',
      error: null
    });

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-org-id',
              name: 'Updated Org',
              domain: 'test.com',
              admin_user_id: 'test-user-id',
              license_id: 'test-license-id'
            },
            error: null
          })
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any;
    });

    // Mock checkEnterpriseAccess for refresh
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null
    });

    // Refresh organization
    await act(async () => {
      await result.current.refreshOrganization();
    });

    // Check updated state
    expect(result.current.organization?.name).toBe('Updated Org');
  });

  it('should handle errors gracefully', async () => {
    // Mock getUserOrganization to throw error
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Failed to get organization'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EnterpriseProvider>{children}</EnterpriseProvider>
    );

    const { result } = renderHook(() => useEnterprise(), { wrapper });

    // Wait for error to be processed
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check error state
    expect(result.current.error).toBe('Failed to get organization');
    expect(result.current.organization).toBeNull();
  });
});