import { supabase } from './supabase';
import { logger } from './logging';

const securityLogger = logger.child({ component: 'security' });

export interface AppPermission {
  id: string;
  app_id: string;
  permission_type: string;
  is_granted: boolean;
}

export interface MemoryAccess {
  id: string;
  app_id: string;
  access_type: string;
  data_scope: string[];
}

export interface SandboxConfig {
  id: string;
  app_id: string;
  isolation_level: string;
  resource_limits: {
    memory_mb: number;
    storage_mb: number;
    cpu_percent: number;
  };
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export async function checkPermission(
  appId: string,
  permissionType: string
): Promise<boolean> {
  try {
    const { data: permission, error } = await supabase
      .from('app_permissions')
      .select('is_granted')
      .eq('app_id', appId)
      .eq('permission_type', permissionType)
      .single();

    if (error) throw error;
    return permission?.is_granted || false;
  } catch (error) {
    securityLogger.error({ appId, permissionType, error }, 'Failed to check permission');
    return false;
  }
}

export async function checkMemoryAccess(
  appId: string,
  accessType: 'read' | 'write' | 'read_write'
): Promise<boolean> {
  try {
    const { data: access, error } = await supabase
      .from('shared_memory_access')
      .select('access_type')
      .eq('app_id', appId)
      .single();

    if (error) throw error;

    if (!access) return false;

    if (access.access_type === 'read_write') return true;
    return access.access_type === accessType;
  } catch (error) {
    securityLogger.error({ appId, accessType, error }, 'Failed to check memory access');
    return false;
  }
}

export async function getSandboxConfig(appId: string): Promise<SandboxConfig | null> {
  try {
    const { data: config, error } = await supabase
      .from('app_sandboxes')
      .select('*')
      .eq('app_id', appId)
      .single();

    if (error) throw error;
    return config;
  } catch (error) {
    securityLogger.error({ appId, error }, 'Failed to get sandbox config');
    return null;
  }
}

export async function updatePermission(
  appId: string,
  permissionType: string,
  granted: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('app_permissions')
      .upsert({
        app_id: appId,
        permission_type: permissionType,
        is_granted: granted
      });

    if (error) throw error;

    securityLogger.info({ appId, permissionType, granted }, 'Permission updated');
  } catch (error) {
    securityLogger.error({ appId, permissionType, granted, error }, 'Failed to update permission');
    throw new SecurityError('Failed to update permission');
  }
}

export async function updateMemoryAccess(
  appId: string,
  accessType: 'read' | 'write' | 'read_write',
  dataScope: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('shared_memory_access')
      .upsert({
        app_id: appId,
        access_type: accessType,
        data_scope: dataScope
      });

    if (error) throw error;

    securityLogger.info({ appId, accessType, dataScope }, 'Memory access updated');
  } catch (error) {
    securityLogger.error({ appId, accessType, dataScope, error }, 'Failed to update memory access');
    throw new SecurityError('Failed to update memory access');
  }
}

export async function initializeSandbox(appId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('app_sandboxes')
      .upsert({
        app_id: appId,
        isolation_level: 'strict',
        resource_limits: {
          memory_mb: 256,
          storage_mb: 100,
          cpu_percent: 50
        }
      });

    if (error) throw error;

    securityLogger.info({ appId }, 'Sandbox initialized');
  } catch (error) {
    securityLogger.error({ appId, error }, 'Failed to initialize sandbox');
    throw new SecurityError('Failed to initialize sandbox');
  }
}

// Helper function to validate permission types
export function isValidPermissionType(type: string): boolean {
  const validTypes = ['basic_profile', 'preferences', 'file_system'];
  return validTypes.includes(type);
}

// Helper function to validate access types
export function isValidAccessType(type: string): boolean {
  const validTypes = ['read', 'write', 'read_write'];
  return validTypes.includes(type);
}

// Helper function to validate data scope
export function isValidDataScope(scope: string[]): boolean {
  const validScopes = ['basic_profile', 'preferences', 'history'];
  return scope.every(s => validScopes.includes(s));
}