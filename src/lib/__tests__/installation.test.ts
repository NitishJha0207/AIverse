import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installApp, uninstallApp, getInstallationStatus, InstallationError } from '../installation';
import { supabase } from '../supabase';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}));

describe('App Installation', () => {
  const mockUser = { 
    id: 'test-user',
    email: 'test@example.com'
  };

  const mockApp = {
    id: 'test-app',
    name: 'Test App',
    version: '1.0.0',
    binary_url: 'test-binary.apk',
    is_native: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    } as any);
  });

  describe('installApp', () => {
    it('should create installation record and download binary', async () => {
      const mockInstallation = {
        id: 'test-installation',
        app_id: mockApp.id,
        user_id: mockUser.id,
        status: 'pending',
        version: mockApp.version
      };

      const mockFrom = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockInstallation,
          error: null
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      vi.mocked(supabase.storage.from).mockReturnValue({
        download: vi.fn().mockResolvedValue({
          data: new Blob(['test-binary']),
          error: null
        })
      } as any);

      const onProgress = vi.fn();
      const installation = await installApp(mockApp as any, onProgress);

      expect(installation.status).toBe('installed');
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        status: 'installed',
        progress: 100
      }));
    });

    it('should handle installation failure', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Installation failed')
        })
      } as any);

      const onProgress = vi.fn();
      await expect(installApp(mockApp as any, onProgress))
        .rejects.toThrow(InstallationError);

      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        error: expect.any(String)
      }));
    });
  });

  describe('uninstallApp', () => {
    it('should mark app as uninstalled', async () => {
      const mockFrom = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      };

      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      await uninstallApp(mockApp.id);

      expect(supabase.from).toHaveBeenCalledWith('app_installations');
      expect(mockFrom.update).toHaveBeenCalledWith({ status: 'uninstalled' });
    });

    it('should handle uninstall failure', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: new Error('Uninstall failed')
        })
      } as any);

      await expect(uninstallApp(mockApp.id))
        .rejects.toThrow(InstallationError);
    });
  });

  describe('getInstallationStatus', () => {
    it('should return installation status', async () => {
      const mockStatus = {
        status: 'installed',
        progress: 100,
        version: '1.0.0'
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockStatus,
          error: null
        })
      } as any);

      const status = await getInstallationStatus(mockApp.id);
      expect(status).toEqual(mockStatus);
    });

    it('should return null for non-existent installation', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      } as any);

      const status = await getInstallationStatus(mockApp.id);
      expect(status).toBeNull();
    });
  });
});