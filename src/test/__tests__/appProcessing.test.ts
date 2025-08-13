import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processAppSubmission, ProcessingError } from '../../lib/appProcessing';
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
    }
  }
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

describe('App Processing System', () => {
  const mockSubmission: AppSubmission = {
    id: 'test-submission-id',
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
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Binary Validation', () => {
    it('should validate binary file successfully', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { id: 'test-job' }, 
          error: null 
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }));

      const onProgress = vi.fn();
      
      // Create a mock file
      const mockFile = new File(['test binary'], 'test.apk', { type: 'application/vnd.android.package-archive' });
      
      await processAppSubmission(mockSubmission, mockFile, onProgress);
      
      expect(onProgress).toHaveBeenCalledWith(20);
    });

    it('should reject invalid binary type', async () => {
      // Create an invalid file
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await expect(processAppSubmission(mockSubmission, invalidFile, vi.fn()))
        .rejects
        .toThrow(ProcessingError);
    });
  });
});