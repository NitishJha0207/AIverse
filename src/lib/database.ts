import { db, storage } from './supabase';
import { handleError } from './errors';
import { clearAppCache } from './cache';
import type { AppListing, UserProfile, AppSubmission } from '../types';

// App operations
export const getAppListings = async (
  page = 1,
  limit = 20,
  category?: string,
  search?: string
): Promise<{ data: AppListing[]; count: number }> => {
  try {
    let query = db.apps
      .select('*')
      .order('rating', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      const searchTerms = search.toLowerCase().split(' ');
      query = query.or(
        searchTerms.map(term => 
          `name.ilike.%${term}%,short_description.ilike.%${term}%`
        ).join(',')
      );
    }

    const { data, error, count } = await query.execute();

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('Failed to fetch app listings:', error);
    throw new Error(handleError(error));
  }
};

export const getAppById = async (id: string): Promise<AppListing | null> => {
  try {
    const { data, error } = await db.apps
      .select('*')
      .eq('id', id)
      .single()
      .execute();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch app:', error);
    throw new Error(handleError(error));
  }
};

// User operations
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await db.users
      .select('*')
      .eq('id', userId)
      .single()
      .execute();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw new Error(handleError(error));
  }
};

// Developer operations
export const createDeveloperProfile = async (profile: Partial<any>) => {
  try {
    const { data, error } = await db.developers
      .insert(profile)
      .select()
      .single()
      .execute();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to create developer profile:', error);
    throw new Error(handleError(error));
  }
};

// App submission operations
export const createAppSubmission = async (submission: Partial<AppSubmission>) => {
  try {
    const { data, error } = await db.submissions
      .insert(submission)
      .select()
      .single()
      .execute();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Failed to create app submission:', error);
    throw new Error(handleError(error));
  }
};

export const uploadAppBinary = async (file: File, appId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${appId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await storage.appBinaries.upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (error) throw error;
    return data?.path || filePath;
  } catch (error) {
    console.error('Failed to upload app binary:', error);
    throw new Error(handleError(error));
  }
};

// Export clearAppCache for use in components
export { clearAppCache };