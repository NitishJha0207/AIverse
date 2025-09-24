import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { AppListing, UserProfile, SharedMemorySettings, SharedMemoryAction } from '../types';
import { DatabaseError } from './errors';
import { clearAppCache } from './cache';
import { logger } from './logging';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

// Create Supabase client with optimized settings
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'aiverse-auth',
    debug: process.env.NODE_ENV === 'development'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-application-name': 'aiverse' }
  }
});

// Test connection and log status
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('app_listings').select('count').limit(1);
    if (error) {
      logger.error({ error }, 'Supabase connection test failed');
    } else {
      logger.info('Supabase connection successful');
    }
  } catch (err) {
    logger.error({ error: err }, 'Supabase connection error');
  }
};

// Test connection on initialization
testConnection();

// Helper function to handle database errors
const handleDatabaseError = (error: any, context: string): never => {
  logger.error({ error, context }, 'Database error occurred');
  
  if (error.code === 'PGRST116') {
    // No data found - this is not always an error
    return null as any;
  }
  
  if (error.code === '23505') { // Unique violation
    throw new DatabaseError('Record already exists');
  }
  
  throw new DatabaseError(error.message || `Failed to ${context}`);
};

// Get app listings
export const getAppListings = async (
  page = 1,
  limit = 20,
  category?: string,
  search?: string
): Promise<{ data: AppListing[]; count: number }> => {
  try {
    let query = supabase
      .from('app_listings')
      .select('*', { count: 'exact' });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    logger.error({ error }, 'Failed to fetch app listings');
    throw new DatabaseError(error instanceof Error ? error.message : 'Failed to load apps');
  }
};

// Get app by ID
export const getAppListingById = async (id: string): Promise<AppListing | null> => {
  try {
    const { data, error } = await supabase
      .from('app_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch app');
    throw new DatabaseError(error instanceof Error ? error.message : 'Failed to load app');
  }
};

// Get installation status
export const getInstallationStatus = async (appId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('app_installations')
      .select(`
        id,
        app_id,
        user_id,
        version,
        status,
        progress,
        error,
        installed_at,
        created_at,
        updated_at,
        app:app_listings!app_id(*)
      `)
      .eq('app_id', appId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    logger.error({ error }, 'Failed to get installation status');
    return null;
  }
};

// Get user installations
export const getUserInstallations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('app_installations')
      .select(`
        id,
        app_id,
        user_id,
        version,
        status,
        progress,
        error,
        installed_at,
        created_at,
        updated_at,
        app:app_listings!app_id(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error }, 'Failed to get user installations');
    return [];
  }
};

// Shared memory operations
export const getSharedMemorySettings = async (userId: string): Promise<SharedMemorySettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data?.preferences?.shared_memory || null;
  } catch (error) {
    handleDatabaseError(error, 'get shared memory settings');
  }
};

export const setupSharedMemory = async (userId: string, settings: SharedMemorySettings): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        preferences: {
          shared_memory: settings
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, 'setup shared memory');
  }
};

export const logSharedMemoryAction = async (action: Omit<SharedMemoryAction, 'id'>): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_shared_memory_action', {
      p_user_id: action.userId,
      p_app_id: action.appId,
      p_category: action.category,
      p_action: action.action,
      p_details: action.payload,
      p_metadata: action.metadata
    });

    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, 'log shared memory action');
  }
};

// Function to create a new user profile if it doesn't exist
export const createUserProfileIfNotExists = async (userId: string, fullName: string): Promise<void> => {
  try {
    // First check if profile exists
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // If profile doesn't exist, create it
    if (!data) {
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: fullName
        });
        
      if (insertError) throw insertError;
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to create user profile');
    // Don't throw, just log the error
  }
};

// Export clearAppCache
export { clearAppCache };