import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { publishApp, PublishingError } from '../../lib/appPublishing';
import { processAppSubmission } from '../../lib/appProcessing';
import { supabase } from '../../lib/supabase';
import type { AppSubmission } from '../../types';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn()
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn()
      }))
    },
    auth: {
      getUser: vi.fn()
    }
  }
}));

// Mock app processing
vi.mock('../../lib/appProcessing', () => ({
  processAppSubmission: vi.fn()
}));

// Mock logger
vi.mock('../../lib/logging', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}));

describe('App Publishing System', () => {
  const mockAppData: Partial<AppSubmission> = {
    developer_id: 'test-dev-id',
    name: 'Test App',
    description: 'Test Description',
    short_description: 'Short Description',
    category: 'productivity',
    tags: ['test', 'app'],
    price: 0,
    icon_url: 'https://example.com/icon.png',
    screenshots: ['https://example.com/screenshot1.png'],
    features: ['Feature 1'],
    required_permissions: [],
    binary_url: null,
    binary_type: null,
    status: 'pending',
    submission_date: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    repository_url: 'https://github.com/test/repo'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth.getUser
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { 
        user: { 
          id: 'test-user-id',
          email: 'test@example.com'
        } 
      },
      error: null
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const invalidData = { ...mockAppData };
      delete (invalidData as any).name;

      // Create a mock file
      const mockFile = new File(['test binary'], 'test.apk', { type: 'application/vnd.android.package-archive' });

      await expect(publishApp(invalidData, 'https://github.com/test/repo', mockFile, vi.fn()))
        .rejects
        .toThrow(PublishingError);
    });
  });

  describe('Submission Process', () => {
    it('should create app submission successfully', async () => {
      const mockSubmission = {
        id: 'test-submission-id',
        ...mockAppData,
        status: 'pending'
      };

      vi.mocked(supabase.from).mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }));

      // Mock developer profile check
      vi.mocked(supabase.from).mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { 
            id: 'test-dev-id', 
            payment_status: 'active',
            user_id: 'test-user-id'
          }, 
          error: null 
        })
      }));

      // Mock processAppSubmission
      vi.mocked(processAppSubmission).mockResolvedValue(undefined);

      const onProgress = vi.fn();
      
      // Create a mock file
      const mockFile = new File(['test binary'], 'test.apk', { type: 'application/vnd.android.package-archive' });
      
      const result = await publishApp(mockAppData, 'https://github.com/test/repo', mockFile, onProgress);

      expect(result).toEqual(mockSubmission);
      expect(onProgress).toHaveBeenCalledWith(20);
    });
  });
});