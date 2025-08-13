import { supabase } from './supabase';
import { processAppSubmission } from './appProcessing';
import type { AppSubmission } from '../types';
import { logger } from './logging';

export class PublishingError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'PublishingError';
  }
}

const publishingLogger = logger.child({ component: 'appPublishing' });

// Validate app data
const validateAppData = (appData: Partial<AppSubmission>) => {
  publishingLogger.debug({ appData }, 'Starting app data validation');
  
  const errors = [];

  if (!appData.name) errors.push('App name is required');
  if (!appData.description) errors.push('App description is required');
  if (!appData.short_description) errors.push('Short description is required');
  if (!appData.category) errors.push('Category is required');
  if (!appData.icon_url) errors.push('Icon URL is required');
  if (!appData.developer_id) errors.push('Developer ID is required');
  if (!appData.repository_url) errors.push('Repository URL is required');

  if (errors.length > 0) {
    publishingLogger.error({ errors }, 'App data validation failed');
    throw new PublishingError(
      'Validation failed: ' + errors.join(', '),
      'VALIDATION_ERROR',
      { errors }
    );
  }

  // Validate icon URL format
  try {
    new URL(appData.icon_url);
  } catch {
    publishingLogger.error({ iconUrl: appData.icon_url }, 'Invalid icon URL format');
    throw new PublishingError(
      'Invalid icon URL format. Please provide a valid URL.',
      'INVALID_ICON_URL'
    );
  }

  // Validate repository URL format
  try {
    new URL(appData.repository_url);
  } catch {
    publishingLogger.error({ repoUrl: appData.repository_url }, 'Invalid repository URL format');
    throw new PublishingError(
      'Invalid repository URL format. Please provide a valid URL.',
      'INVALID_REPO_URL'
    );
  }

  // Validate screenshots if provided
  if (appData.screenshots?.length) {
    appData.screenshots.forEach((url, index) => {
      try {
        new URL(url);
      } catch {
        publishingLogger.error({ screenshotUrl: url, index }, 'Invalid screenshot URL format');
        throw new PublishingError(
          `Invalid screenshot URL format at position ${index + 1}`,
          'INVALID_SCREENSHOT_URL',
          { index, url }
        );
      }
    });
  }

  publishingLogger.debug('App data validation completed successfully');
};

// Verify developer permissions
const verifyDeveloperPermissions = async (developerId: string): Promise<void> => {
  publishingLogger.debug({ developerId }, 'Verifying developer permissions');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      publishingLogger.error({ error: userError }, 'Failed to get current user');
      throw userError;
    }
    if (!user) {
      publishingLogger.error('No authenticated user found');
      throw new Error('Not authenticated');
    }

    // Check developer profile
    const { data: profile, error: profileError } = await supabase
      .from('developer_profiles')
      .select('id, payment_status, user_id')
      .eq('id', developerId)
      .single();

    if (profileError) {
      publishingLogger.error({ error: profileError }, 'Failed to fetch developer profile');
      if (profileError.code === 'PGRST116') {
        throw new PublishingError(
          'Developer profile not found. Please complete registration.',
          'PROFILE_NOT_FOUND'
        );
      }
      throw profileError;
    }

    if (!profile) {
      publishingLogger.error('Developer profile not found');
      throw new PublishingError(
        'Developer profile not found. Please complete registration.',
        'PROFILE_NOT_FOUND'
      );
    }

    // Verify user owns this profile
    if (profile.user_id !== user.id) {
      publishingLogger.error({ 
        profileUserId: profile.user_id, 
        currentUserId: user.id 
      }, 'User does not own this developer profile');
      throw new PublishingError(
        'Permission denied. You do not own this developer profile.',
        'PERMISSION_DENIED'
      );
    }

    if (profile.payment_status !== 'active') {
      publishingLogger.error({ paymentStatus: profile.payment_status }, 'Developer account not active');
      throw new PublishingError(
        'Developer account is not active. Please complete payment.',
        'INACTIVE_ACCOUNT'
      );
    }

    publishingLogger.debug('Developer permissions verified successfully');
  } catch (error) {
    if (error instanceof PublishingError) throw error;
    
    publishingLogger.error({ error }, 'Failed to verify developer permissions');
    throw new PublishingError(
      'Failed to verify developer permissions',
      'PERMISSION_ERROR',
      { originalError: error }
    );
  }
};

export async function publishApp(
  appData: Partial<AppSubmission>,
  repoUrl: string,
  file?: File,
  onProgress?: (progress: number) => void
): Promise<AppSubmission> {
  const logContext = { 
    appName: appData.name,
    developerId: appData.developer_id,
    repoUrl
  };

  try {
    publishingLogger.info(logContext, 'Starting app publishing process');

    // Step 1: Validate inputs (10%)
    publishingLogger.debug(logContext, 'Step 1: Validating inputs');
    validateAppData(appData);
    onProgress?.(10);

    // Verify developer permissions
    publishingLogger.debug(logContext, 'Verifying developer permissions');
    await verifyDeveloperPermissions(appData.developer_id!);

    publishingLogger.info(logContext, 'Validation completed successfully');

    // Step 2: Create app submission (20%)
    publishingLogger.debug(logContext, 'Step 2: Creating app submission');
    const { data: submission, error: submissionError } = await supabase
      .from('app_submissions')
      .insert({
        developer_id: appData.developer_id,
        name: appData.name,
        description: appData.description,
        short_description: appData.short_description,
        category: appData.category,
        tags: appData.tags || [],
        price: appData.price || 0,
        icon_url: appData.icon_url,
        screenshots: appData.screenshots || [],
        features: appData.features || [],
        status: 'pending',
        submission_date: new Date().toISOString(),
        metadata: {
          repository_url: repoUrl,
          build_config: appData.build_config
        }
      })
      .select()
      .single();

    if (submissionError) {
      publishingLogger.error({ error: submissionError }, 'Failed to create app submission');
      if (submissionError.code === '23505') {
        throw new PublishingError('An app with this name already exists', 'DUPLICATE_APP_NAME');
      }
      throw submissionError;
    }

    if (!submission) {
      publishingLogger.error('No submission data returned');
      throw new PublishingError('Failed to create app submission', 'SUBMISSION_FAILED');
    }

    onProgress?.(20);
    publishingLogger.info({ submissionId: submission.id }, 'App submission created successfully');

    // Step 3: Process submission (20-90%)
    publishingLogger.debug({ submissionId: submission.id }, 'Step 3: Processing submission');
    await processAppSubmission(submission, onProgress ? (progress) => {
      onProgress(20 + (progress * 0.7)); // 20-90%
    } : undefined);

    publishingLogger.info({ submissionId: submission.id }, 'Submission processed successfully');

    // Step 4: Get final submission state (100%)
    publishingLogger.debug({ submissionId: submission.id }, 'Step 4: Getting final submission state');
    const { data: finalSubmission, error: getError } = await supabase
      .from('app_submissions')
      .select('*')
      .eq('id', submission.id)
      .single();

    if (getError) {
      publishingLogger.error({ error: getError }, 'Failed to retrieve final submission state');
      throw getError;
    }
    
    if (!finalSubmission) {
      publishingLogger.error('No final submission data returned');
      throw new PublishingError('Failed to retrieve final submission state', 'RETRIEVAL_FAILED');
    }

    onProgress?.(100);
    publishingLogger.info({ submissionId: submission.id }, 'App publishing completed successfully');

    return finalSubmission;
  } catch (error) {
    publishingLogger.error({ ...logContext, error }, 'App publishing failed');
    
    if (error instanceof PublishingError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes('row-level security')) {
        throw new PublishingError(
          'Permission denied. Please ensure you have the correct permissions.',
          'PERMISSION_DENIED',
          { originalError: error.message }
        );
      }
      
      throw new PublishingError(
        error.message,
        'UNKNOWN_ERROR',
        { originalError: error.message }
      );
    }

    throw new PublishingError(
      'An unexpected error occurred while publishing the app',
      'UNKNOWN_ERROR'
    );
  }
}

export async function getAppSubmission(id: string): Promise<AppSubmission | null> {
  try {
    publishingLogger.debug({ submissionId: id }, 'Fetching app submission');
    
    const { data, error } = await supabase
      .from('app_submissions')
      .select(`
        *,
        processing_job:app_processing_jobs(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    publishingLogger.debug({ submissionId: id }, 'App submission fetched successfully');
    return data;
  } catch (error) {
    publishingLogger.error({ submissionId: id, error }, 'Failed to fetch app submission');
    return null;
  }
}

export async function getAppSubmissions(developerId: string): Promise<AppSubmission[]> {
  try {
    publishingLogger.debug({ developerId }, 'Fetching app submissions');
    
    const { data, error } = await supabase
      .from('app_submissions')
      .select(`
        *,
        processing_job:app_processing_jobs(*)
      `)
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    publishingLogger.debug({ developerId, count: data?.length }, 'App submissions fetched successfully');
    return data || [];
  } catch (error) {
    publishingLogger.error({ developerId, error }, 'Failed to fetch app submissions');
    return [];
  }
}