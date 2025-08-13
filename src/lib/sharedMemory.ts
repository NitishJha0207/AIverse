import { supabase } from './supabase';
import { logger } from './logging';
import type { SharedMemoryAction } from '../types';

export class SharedMemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SharedMemoryError';
  }
}

export async function logSharedMemoryAction(action: SharedMemoryAction) {
  try {
    logger.debug({ action }, 'Logging shared memory action');

    const { error } = await supabase.rpc('log_shared_memory_action', {
      p_user_id: action.userId,
      p_app_id: action.appId,
      p_category: action.category,
      p_action: action.action,
      p_details: action.payload || {},
      p_metadata: {
        platform: 'web',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.pathname
      }
    });

    if (error) throw error;

    logger.info({ action }, 'Shared memory action logged successfully');

  } catch (error) {
    logger.error({ error, action }, 'Failed to log shared memory action');
    throw new SharedMemoryError(error instanceof Error ? error.message : 'Failed to log action');
  }
}

export async function createSharedMemoryVersion(
  actionId: string,
  data: any,
  encrypt = false
) {
  try {
    logger.debug({ actionId, encrypt }, 'Creating shared memory version');

    const { data: version, error } = await supabase.rpc('create_shared_memory_version', {
      p_action_id: actionId,
      p_data: data,
      p_encrypt: encrypt
    });

    if (error) throw error;

    logger.info({ actionId, versionId: version.id }, 'Created shared memory version');
    return version;

  } catch (error) {
    logger.error({ error, actionId }, 'Failed to create shared memory version');
    throw new SharedMemoryError(error instanceof Error ? error.message : 'Failed to create version');
  }
}

export async function getSharedMemoryVersions(actionId: string) {
  try {
    logger.debug({ actionId }, 'Fetching shared memory versions');

    const { data, error } = await supabase
      .from('shared_memory_versions')
      .select('*')
      .eq('action_id', actionId)
      .order('version_number', { ascending: false });

    if (error) throw error;

    logger.info({ actionId, versionCount: data?.length }, 'Fetched shared memory versions');
    return data || [];

  } catch (error) {
    logger.error({ error, actionId }, 'Failed to fetch shared memory versions');
    throw new SharedMemoryError(error instanceof Error ? error.message : 'Failed to fetch versions');
  }
}

export async function getSharedMemoryActions(
  userId: string,
  category?: string,
  limit = 50
) {
  try {
    logger.debug({ userId, category }, 'Fetching shared memory actions');

    let query = supabase
      .from('shared_memory_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    logger.info({ userId, actionCount: data?.length }, 'Fetched shared memory actions');
    return data || [];

  } catch (error) {
    logger.error({ error, userId }, 'Failed to fetch shared memory actions');
    throw new SharedMemoryError(error instanceof Error ? error.message : 'Failed to fetch actions');
  }
}

export async function deleteSharedMemoryAction(actionId: string) {
  try {
    logger.debug({ actionId }, 'Deleting shared memory action');

    const { error } = await supabase
      .from('shared_memory_actions')
      .update({ is_deleted: true })
      .eq('id', actionId);

    if (error) throw error;

    logger.info({ actionId }, 'Deleted shared memory action');

  } catch (error) {
    logger.error({ error, actionId }, 'Failed to delete shared memory action');
    throw new SharedMemoryError(error instanceof Error ? error.message : 'Failed to delete action');
  }
}