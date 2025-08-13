import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { persistSession, recoverSession, validateSession, clearSession } from '../session';
import { supabase } from '../supabase';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      setSession: vi.fn(),
      refreshSession: vi.fn()
    }
  }
}));

describe('Session Management', () => {
  const mockSession = {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: Date.now() + 3600000,
    expires_in: 3600,
    user: {
      id: 'test-user',
      email: 'test@example.com'
    }
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('persistSession', () => {
    it('should store encrypted session in localStorage', () => {
      persistSession(mockSession as any);
      
      const storedSession = localStorage.getItem('aiverse-session');
      expect(storedSession).toBeTruthy();
      
      const decrypted = JSON.parse(atob(storedSession!));
      expect(decrypted).toEqual(mockSession);
    });

    it('should set expiry time', () => {
      persistSession(mockSession as any);
      
      const expiry = localStorage.getItem('aiverse-session-expiry');
      expect(expiry).toBeTruthy();
      expect(parseInt(expiry!)).toBeGreaterThan(Date.now());
    });

    it('should clear session when null is passed', () => {
      persistSession(mockSession as any);
      persistSession(null);
      
      expect(localStorage.getItem('aiverse-session')).toBeNull();
      expect(localStorage.getItem('aiverse-session-expiry')).toBeNull();
    });
  });

  describe('recoverSession', () => {
    it('should recover valid session', () => {
      persistSession(mockSession as any);
      const recovered = recoverSession();
      expect(recovered).toEqual(mockSession);
    });

    it('should return null for expired session', () => {
      persistSession(mockSession as any);
      
      // Set expiry to past
      localStorage.setItem('aiverse-session-expiry', (Date.now() - 1000).toString());
      
      const recovered = recoverSession();
      expect(recovered).toBeNull();
    });

    it('should return null for invalid session data', () => {
      localStorage.setItem('aiverse-session', 'invalid-data');
      const recovered = recoverSession();
      expect(recovered).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should validate and refresh existing session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null
      });

      const isValid = await validateSession();
      expect(isValid).toBe(true);
    });

    it('should attempt recovery for missing session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      persistSession(mockSession as any);

      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null
      });

      const isValid = await validateSession();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const isValid = await validateSession();
      expect(isValid).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('should clear all session data', () => {
      persistSession(mockSession as any);
      clearSession();
      
      expect(localStorage.getItem('aiverse-session')).toBeNull();
      expect(localStorage.getItem('aiverse-session-expiry')).toBeNull();
    });

    it('should clear refresh interval', () => {
      persistSession(mockSession as any);
      clearSession();
      
      // Verify interval is cleared
      const timeouts = vi.getTimerCount();
      expect(timeouts).toBe(0);
    });
  });
});