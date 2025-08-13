import { supabase } from './supabase';
import { logger } from './logging';
import { 
  Organization, 
  License, 
  LicenseTier, 
  OrganizationUser,
  Team,
  TeamMember,
  EnterpriseSettings,
  AuditLog,
  AppContainer,
  SupportTicket
} from '../types';

// Error class for enterprise operations
export class EnterpriseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'EnterpriseError';
  }
}

// Check if user has enterprise access
export async function checkEnterpriseAccess(
  userId: string,
  requiredTier: LicenseTier = LicenseTier.ENTERPRISE_STANDARD
): Promise<boolean> {
  try {
    // Direct query to check if user has access to an organization with the required license tier
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select(`
        organization_id,
        organization:organizations(
          id,
          license_id,
          license:licenses(
            id,
            tier,
            is_active,
            expires_at
          )
        )
      `)
      .eq('user_id', userId);

    if (orgUsersError) throw orgUsersError;
    
    // Also check if user is an admin of any organization
    const { data: adminOrgs, error: adminOrgsError } = await supabase
      .from('organizations')
      .select(`
        id,
        license_id,
        license:licenses(
          id,
          tier,
          is_active,
          expires_at
        )
      `)
      .eq('admin_user_id', userId);
      
    if (adminOrgsError) throw adminOrgsError;
    
    // Combine both sets of organizations
    const allOrgs = [
      ...(orgUsers || []).map(ou => ou.organization),
      ...(adminOrgs || [])
    ];
    
    // Check if any organization has the required license tier
    return allOrgs.some(org => {
      if (!org || !org.license) return false;
      
      return (
        org.license.tier === requiredTier &&
        org.license.is_active &&
        new Date(org.license.expires_at) > new Date()
      );
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to check enterprise access');
    return false;
  }
}

// Get user's organization
export async function getUserOrganization(userId: string): Promise<Organization | null> {
  try {
    // First check if user is an admin of any organization
    const { data: adminOrg, error: adminOrgError } = await supabase
      .from('organizations')
      .select(`
        *,
        license:licenses(*)
      `)
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (adminOrgError && adminOrgError.code !== 'PGRST116') throw adminOrgError;
    
    if (adminOrg) return adminOrg;

    // If not an admin, check organization_users table
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (orgUserError && orgUserError.code !== 'PGRST116') throw orgUserError;
    if (!orgUser) return null;

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        license:licenses(*)
      `)
      .eq('id', orgUser.organization_id)
      .single();

    if (orgError) throw orgError;
    return organization;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user organization');
    return null;
  }
}

// Check if user is organization admin
export async function isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
  try {
    // Check if user is the organization admin
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('admin_user_id')
      .eq('id', organizationId)
      .single();
      
    if (orgError) throw orgError;
    
    if (org.admin_user_id === userId) {
      return true;
    }
    
    // Check if user has admin role in organization_users
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
      
    if (orgUserError && orgUserError.code !== 'PGRST116') throw orgUserError;
    
    return !!orgUser;
  } catch (error) {
    logger.error({ error, userId, organizationId }, 'Failed to check if user is organization admin');
    return false;
  }
}

// Create a new organization
export async function createOrganization(
  name: string,
  domain: string,
  adminUserId: string,
  tier: LicenseTier = LicenseTier.BASIC
): Promise<string> {
  try {
    console.log('Creating organization:', { name, domain, adminUserId, tier });
    
    // Create organization first
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        domain,
        admin_user_id: adminUserId
      })
      .select()
      .single();
      
    if (orgError) throw orgError;
    
    // Set license details
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year from now
    
    let maxUsers = 1;
    if (tier === LicenseTier.ENTERPRISE_STANDARD) {
      maxUsers = 2;
    } else if (tier === LicenseTier.ENTERPRISE_PREMIUM) {
      maxUsers = 5;
    } else {
      maxUsers = 10; // Basic tier (which is actually advanced in our UI)
    }
    
    // Create features array based on tier
    let features: string[] = [];
    if (tier === LicenseTier.BASIC) {
      features = [
        'standard_app_installation', 
        'basic_security', 
        'individual_user_controls',
        'advanced_analytics',
        'priority_support',
        'custom_integrations'
      ];
    } else if (tier === LicenseTier.ENTERPRISE_STANDARD) {
      features = [
        'standard_app_installation', 
        'basic_security', 
        'individual_user_controls',
        'team_management',
        'sso_integration',
        'advanced_security'
      ];
    } else {
      features = [
        'standard_app_installation', 
        'basic_security', 
        'individual_user_controls',
        'team_management',
        'sso_integration',
        'advanced_security',
        'usage_analytics',
        'sla_support',
        'custom_app_deployment'
      ];
    }
    
    // Create license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        organization_id: org.id,
        tier,
        max_users: maxUsers,
        current_users: 1, // Start with 1 user (the admin)
        features,
        expires_at: expiryDate.toISOString(),
        is_active: true
      })
      .select()
      .single();
      
    if (licenseError) throw licenseError;
    
    // Update organization with license ID
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        license_id: license.id
      })
      .eq('id', org.id);
      
    if (updateError) throw updateError;
    
    // Add admin user to organization_users
    const { error: userError } = await supabase
      .from('organization_users')
      .insert({
        organization_id: org.id,
        user_id: adminUserId,
        role: 'admin'
      });
      
    if (userError) throw userError;
    
    // Create default enterprise settings
    const { error: settingsError } = await supabase
      .from('enterprise_settings')
      .insert({
        organization_id: org.id
      });
      
    if (settingsError) throw settingsError;

    // Log audit event
    try {
      await logAuditEvent(
        org.id,
        'organization_created',
        'organizations',
        org.id,
        { tier }
      );
      console.log('Audit event logged');
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }

    return org.id;
  } catch (err) {
    console.error('Failed to create organization:', err);
    logger.error({ error: err, name, domain, adminUserId }, 'Failed to create organization');
    throw new EnterpriseError(
      err instanceof Error ? err.message : 'Failed to create organization'
    );
  }
}

// Get features by license tier
function getFeaturesByTier(tier: LicenseTier): string[] {
  switch (tier) {
    case LicenseTier.BASIC:
      return [
        'standard_app_installation',
        'basic_security',
        'individual_user_controls',
        'advanced_analytics',
        'priority_support',
        'custom_integrations'
      ];
    case LicenseTier.ENTERPRISE_STANDARD:
      return [
        'standard_app_installation',
        'basic_security',
        'individual_user_controls',
        'team_management',
        'sso_integration',
        'advanced_security'
      ];
    case LicenseTier.ENTERPRISE_PREMIUM:
      return [
        'standard_app_installation',
        'basic_security',
        'individual_user_controls',
        'team_management',
        'sso_integration',
        'advanced_security',
        'usage_analytics',
        'sla_support',
        'custom_app_deployment'
      ];
  }
}

// Get organization users
export async function getOrganizationUsers(organizationId: string): Promise<OrganizationUser[]> {
  try {
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        *,
        user:users(id, email, name)
      `)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get organization users');
    return [];
  }
}

// Add user to organization
export async function addUserToOrganization(
  organizationId: string,
  userEmail: string,
  role: 'admin' | 'manager' | 'user' = 'user',
  department?: string,
  jobTitle?: string
): Promise<OrganizationUser | null> {
  try {
    // First check if the organization has available licenses
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        license_id,
        license:licenses(max_users, current_users)
      `)
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;
    
    if (!org.license || typeof org.license.current_users !== 'number' || typeof org.license.max_users !== 'number') {
      throw new EnterpriseError('Invalid license information', 'INVALID_LICENSE');
    }
    
    if (org.license.current_users >= org.license.max_users) {
      throw new EnterpriseError('License user limit reached', 'LICENSE_LIMIT_REACHED');
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        throw new EnterpriseError('User not found', 'USER_NOT_FOUND');
      }
      throw userError;
    }

    // Add user to organization
    const { data: orgUser, error: addError } = await supabase
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        role,
        department,
        job_title: jobTitle
      })
      .select()
      .single();

    if (addError) {
      if (addError.code === '23505') { // Unique violation
        throw new EnterpriseError('User already in organization', 'USER_ALREADY_EXISTS');
      }
      throw addError;
    }

    // Increment license user count
    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        current_users: org.license.current_users + 1
      })
      .eq('id', org.license_id);

    if (updateError) throw updateError;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'user_added',
        'organization_users',
        orgUser.id,
        { email: userEmail, role }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }

    return orgUser;
  } catch (error) {
    logger.error({ error, organizationId, userEmail }, 'Failed to add user to organization');
    if (error instanceof EnterpriseError) {
      throw error;
    }
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to add user to organization'
    );
  }
}

// Remove user from organization
export async function removeUserFromOrganization(
  organizationId: string,
  userId: string
): Promise<void> {
  try {
    // Check if user is the organization admin
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('admin_user_id, license_id')
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;

    if (org.admin_user_id === userId) {
      throw new EnterpriseError('Cannot remove organization admin', 'ADMIN_REMOVAL_FORBIDDEN');
    }

    // Remove user from organization
    const { error: removeError } = await supabase
      .from('organization_users')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (removeError) throw removeError;

    // Decrement license user count
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('current_users')
      .eq('id', org.license_id)
      .single();

    if (licenseError) throw licenseError;

    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        current_users: Math.max(0, license.current_users - 1)
      })
      .eq('id', org.license_id);

    if (updateError) throw updateError;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'user_removed',
        'organization_users',
        null,
        { user_id: userId }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }
  } catch (error) {
    logger.error({ error, organizationId, userId }, 'Failed to remove user from organization');
    if (error instanceof EnterpriseError) {
      throw error;
    }
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to remove user from organization'
    );
  }
}

// Create team
export async function createTeam(
  organizationId: string,
  name: string,
  description?: string
): Promise<Team> {
  try {
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        organization_id: organizationId,
        name,
        description,
        created_by: await supabase.auth.getUser().then(res => res.data.user?.id)
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'team_created',
        'teams',
        team.id,
        { name, description }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }

    return team;
  } catch (error) {
    logger.error({ error, organizationId, name }, 'Failed to create team');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to create team'
    );
  }
}

// Get teams for organization
export async function getOrganizationTeams(organizationId: string): Promise<Team[]> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          id,
          user_id,
          role,
          user:users(id, email, name)
        )
      `)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get organization teams');
    return [];
  }
}

// Add user to team
export async function addUserToTeam(
  teamId: string,
  userId: string,
  role: 'owner' | 'member' = 'member'
): Promise<TeamMember> {
  try {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .single();

    if (teamError) throw teamError;

    // Check if user is in the organization
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select('id')
      .eq('organization_id', team.organization_id)
      .eq('user_id', userId)
      .single();

    if (orgUserError) {
      if (orgUserError.code === 'PGRST116') {
        throw new EnterpriseError('User is not a member of the organization', 'USER_NOT_IN_ORG');
      }
      throw orgUserError;
    }

    // Add user to team
    const { data: teamMember, error: addError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role
      })
      .select()
      .single();

    if (addError) {
      if (addError.code === '23505') { // Unique violation
        throw new EnterpriseError('User already in team', 'USER_ALREADY_IN_TEAM');
      }
      throw addError;
    }

    // Log audit event
    try {
      await logAuditEvent(
        team.organization_id,
        'team_member_added',
        'team_members',
        teamMember.id,
        { team_id: teamId, user_id: userId, role }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }

    return teamMember;
  } catch (error) {
    logger.error({ error, teamId, userId }, 'Failed to add user to team');
    if (error instanceof EnterpriseError) {
      throw error;
    }
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to add user to team'
    );
  }
}

// Remove user from team
export async function removeUserFromTeam(
  teamId: string,
  userId: string
): Promise<void> {
  try {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('organization_id')
      .eq('id', teamId)
      .single();

    if (teamError) throw teamError;

    // Check if user is the last owner
    const { data: owners, error: ownersError } = await supabase
      .from('team_members')
      .select('id, user_id')
      .eq('team_id', teamId)
      .eq('role', 'owner');

    if (ownersError) throw ownersError;

    if (owners.length === 1 && owners[0].user_id === userId) {
      throw new EnterpriseError('Cannot remove the last team owner', 'LAST_OWNER_REMOVAL_FORBIDDEN');
    }

    // Remove user from team
    const { error: removeError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (removeError) throw removeError;

    // Log audit event
    try {
      await logAuditEvent(
        team.organization_id,
        'team_member_removed',
        'team_members',
        null,
        { team_id: teamId, user_id: userId }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }
  } catch (error) {
    logger.error({ error, teamId, userId }, 'Failed to remove user from team');
    if (error instanceof EnterpriseError) {
      throw error;
    }
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to remove user from team'
    );
  }
}

// Get enterprise settings
export async function getEnterpriseSettings(organizationId: string): Promise<EnterpriseSettings | null> {
  try {
    const { data, error } = await supabase
      .from('enterprise_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get enterprise settings');
    return null;
  }
}

// Update enterprise settings
export async function updateEnterpriseSettings(
  organizationId: string,
  settings: Partial<EnterpriseSettings>
): Promise<EnterpriseSettings> {
  try {
    const { data, error } = await supabase
      .from('enterprise_settings')
      .update({
        security_policy: settings.security_policy,
        compliance_settings: settings.compliance_settings
      })
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'settings_updated',
        'enterprise_settings',
        organizationId,
        { changes: settings }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }

    return data;
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to update enterprise settings');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to update enterprise settings'
    );
  }
}

// Log audit event
export async function logAuditEvent(
  organizationId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, any> = {}
): Promise<AuditLog> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        organization_id: organizationId,
        user_id: user.user?.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: 'client-side', // This will be overridden by the server
        user_agent: navigator.userAgent
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error({ error, organizationId, action, resourceType }, 'Failed to log audit event');
    // Don't throw here, just log the error
    return {
      id: 'failed',
      organization_id: organizationId,
      user_id: '',
      action,
      resource_type: resourceType,
      resource_id: resourceId || undefined,
      details,
      ip_address: '',
      user_agent: '',
      created_at: new Date().toISOString()
    };
  }
}

// Get audit logs
export async function getAuditLogs(
  organizationId: string,
  filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<AuditLog[]> {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(id, email, name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error, organizationId, filters }, 'Failed to get audit logs');
    return [];
  }
}

// Create app container
export async function createAppContainer(
  appId: string,
  userId: string,
  organizationId?: string
): Promise<AppContainer> {
  try {
    // Get app details
    const { data: app, error: appError } = await supabase
      .from('app_listings')
      .select('*')
      .eq('id', appId)
      .single();

    if (appError) throw appError;

    // Create container
    const { data: container, error: containerError } = await supabase
      .from('app_containers')
      .insert({
        app_id: appId,
        user_id: userId,
        organization_id: organizationId,
        status: 'running',
        resource_usage: {
          cpu_percent: 0,
          memory_mb: 0,
          storage_mb: 0
        },
        network_isolation: {
          allowed_domains: [],
          blocked_domains: []
        }
      })
      .select()
      .single();

    if (containerError) throw containerError;

    // Log audit event if organization is provided
    if (organizationId) {
      try {
        await logAuditEvent(
          organizationId,
          'container_created',
          'app_containers',
          container.id,
          { app_id: appId, app_name: app.name }
        );
      } catch (logError) {
        // Just log the error but don't fail the operation
        console.error('Failed to log audit event:', logError);
      }
    }

    return container;
  } catch (error) {
    logger.error({ error, appId, userId }, 'Failed to create app container');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to create app container'
    );
  }
}

// Get app container
export async function getAppContainer(
  appId: string,
  userId: string
): Promise<AppContainer | null> {
  try {
    const { data, error } = await supabase
      .from('app_containers')
      .select('*')
      .eq('app_id', appId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error({ error, appId, userId }, 'Failed to get app container');
    return null;
  }
}

// Update app container status
export async function updateAppContainerStatus(
  containerId: string,
  status: 'running' | 'stopped' | 'failed',
  resourceUsage?: {
    cpu_percent: number;
    memory_mb: number;
    storage_mb: number;
  }
): Promise<void> {
  try {
    const updateData: any = { status };
    
    if (resourceUsage) {
      updateData.resource_usage = resourceUsage;
    }
    
    const { error } = await supabase
      .from('app_containers')
      .update(updateData)
      .eq('id', containerId);

    if (error) throw error;

    // Get container details for audit log
    const { data: container, error: containerError } = await supabase
      .from('app_containers')
      .select('organization_id, app_id')
      .eq('id', containerId)
      .single();

    if (containerError) throw containerError;

    // Log audit event if organization is provided
    if (container.organization_id) {
      try {
        await logAuditEvent(
          container.organization_id,
          `container_${status}`,
          'app_containers',
          containerId,
          { app_id: container.app_id, resource_usage: resourceUsage }
        );
      } catch (logError) {
        // Just log the error but don't fail the operation
        console.error('Failed to log audit event:', logError);
      }
    }
  } catch (error) {
    logger.error({ error, containerId, status }, 'Failed to update app container status');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to update app container status'
    );
  }
}

// Create support ticket
export async function createSupportTicket(
  organizationId: string,
  subject: string,
  description: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<SupportTicket> {
  try {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        organization_id: organizationId,
        user_id: await supabase.auth.getUser().then(res => res.data.user?.id),
        subject,
        description,
        status: 'open',
        priority
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'ticket_created',
        'support_tickets',
        ticket.id,
        { subject, priority }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }

    return ticket;
  } catch (error) {
    logger.error({ error, organizationId, subject }, 'Failed to create support ticket');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to create support ticket'
    );
  }
}

// Get support tickets
export async function getSupportTickets(
  organizationId: string,
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<SupportTicket[]> {
  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        created_by:users!user_id(id, email, name),
        assigned_to_user:users!assigned_to(id, email, name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get support tickets');
    return [];
  }
}

// Update support ticket
export async function updateSupportTicket(
  ticketId: string,
  updates: {
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    assigned_to?: string;
  }
): Promise<void> {
  try {
    // Get ticket details for audit log
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('organization_id')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;

    const updateData: any = { ...updates };
    
    // If status is being set to resolved, set resolved_at
    if (updates.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) throw error;

    // Log audit event
    try {
      await logAuditEvent(
        ticket.organization_id,
        'ticket_updated',
        'support_tickets',
        ticketId,
        updates
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }
  } catch (error) {
    logger.error({ error, ticketId, updates }, 'Failed to update support ticket');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to update support ticket'
    );
  }
}

// Configure SSO for organization
export async function configureSso(
  organizationId: string,
  provider: 'azure' | 'google' | 'okta' | 'custom',
  config: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('organizations')
      .update({
        sso_enabled: true,
        sso_provider: provider,
        sso_config: config
      })
      .eq('id', organizationId);

    if (error) throw error;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'sso_configured',
        'organizations',
        organizationId,
        { provider }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }
  } catch (error) {
    logger.error({ error, organizationId, provider }, 'Failed to configure SSO');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to configure SSO'
    );
  }
}

// Configure DLP rules
export async function configureDlpRules(
  organizationId: string,
  rules: Record<string, any>[]
): Promise<void> {
  try {
    // Get current settings
    const { data: settings, error: settingsError } = await supabase
      .from('enterprise_settings')
      .select('compliance_settings')
      .eq('organization_id', organizationId)
      .single();

    if (settingsError) throw settingsError;

    // Update DLP rules
    const updatedSettings = {
      ...settings.compliance_settings,
      dlp_enabled: true,
      dlp_rules: rules
    };

    const { error } = await supabase
      .from('enterprise_settings')
      .update({
        compliance_settings: updatedSettings
      })
      .eq('organization_id', organizationId);

    if (error) throw error;

    // Log audit event
    try {
      await logAuditEvent(
        organizationId,
        'dlp_rules_updated',
        'enterprise_settings',
        organizationId,
        { rule_count: rules.length }
      );
    } catch (logError) {
      // Just log the error but don't fail the operation
      console.error('Failed to log audit event:', logError);
    }
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to configure DLP rules');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to configure DLP rules'
    );
  }
}

// Get DLP rules
export async function getDlpRules(organizationId: string): Promise<Record<string, any>[]> {
  try {
    const { data, error } = await supabase
      .from('enterprise_settings')
      .select('compliance_settings')
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data.compliance_settings.dlp_rules || [];
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get DLP rules');
    return [];
  }
}

// Monitor resource usage
export async function monitorResourceUsage(
  containerId: string,
  metrics: {
    cpu_percent: number;
    memory_mb: number;
    storage_mb: number;
  }
): Promise<void> {
  try {
    // Update container resource usage
    const { error: updateError } = await supabase
      .from('app_containers')
      .update({
        resource_usage: metrics
      })
      .eq('id', containerId);

    if (updateError) throw updateError;

    // Get container details
    const { data: container, error: containerError } = await supabase
      .from('app_containers')
      .select('organization_id, app_id, user_id')
      .eq('id', containerId)
      .single();

    if (containerError) throw containerError;

    // Check for threshold violations
    const { data: settings, error: settingsError } = await supabase
      .from('app_sandboxes')
      .select('monitoring_config')
      .eq('app_id', container.app_id)
      .eq('user_id', container.user_id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    // If sandbox settings exist, check thresholds
    if (settings && settings.monitoring_config) {
      const thresholds = settings.monitoring_config.alert_thresholds;
      
      // Check CPU threshold
      if (metrics.cpu_percent > thresholds.cpu_percent) {
        // Log monitoring event
        await supabase
          .from('app_monitoring_events')
          .insert({
            app_id: container.app_id,
            user_id: container.user_id,
            event_type: 'resource_limit',
            severity: metrics.cpu_percent > thresholds.cpu_percent * 1.5 ? 'critical' : 'warning',
            details: {
              resource: 'cpu',
              current: metrics.cpu_percent,
              threshold: thresholds.cpu_percent
            }
          });
      }
      
      // Check memory threshold
      if (metrics.memory_mb / 256 * 100 > thresholds.memory_percent) {
        // Log monitoring event
        await supabase
          .from('app_monitoring_events')
          .insert({
            app_id: container.app_id,
            user_id: container.user_id,
            event_type: 'resource_limit',
            severity: metrics.memory_mb / 256 * 100 > thresholds.memory_percent * 1.5 ? 'critical' : 'warning',
            details: {
              resource: 'memory',
              current: metrics.memory_mb,
              threshold: 256 * thresholds.memory_percent / 100
            }
          });
      }
      
      // Check storage threshold
      if (metrics.storage_mb / 100 * 100 > thresholds.storage_percent) {
        // Log monitoring event
        await supabase
          .from('app_monitoring_events')
          .insert({
            app_id: container.app_id,
            user_id: container.user_id,
            event_type: 'resource_limit',
            severity: metrics.storage_mb / 100 * 100 > thresholds.storage_percent * 1.5 ? 'critical' : 'warning',
            details: {
              resource: 'storage',
              current: metrics.storage_mb,
              threshold: 100 * thresholds.storage_percent / 100
            }
          });
      }
    }

    // Log audit event if organization is provided
    if (container.organization_id) {
      try {
        await logAuditEvent(
          container.organization_id,
          'resource_usage_updated',
          'app_containers',
          containerId,
          { metrics }
        );
      } catch (logError) {
        // Just log the error but don't fail the operation
        console.error('Failed to log audit event:', logError);
      }
    }
  } catch (error) {
    logger.error({ error, containerId, metrics }, 'Failed to monitor resource usage');
    throw new EnterpriseError(
      error instanceof Error ? error.message : 'Failed to monitor resource usage'
    );
  }
}

// Get all organizations (admin only)
export async function getAllOrganizations(): Promise<Organization[]> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        license:licenses(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error }, 'Failed to get all organizations');
    return [];
  }
}

// Get organization by domain
export async function getOrganizationByDomain(domain: string): Promise<Organization | null> {
  try {
    console.log("Fetching organization by domain:", domain);
    
    // Direct database query to check if organization exists with this domain
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        license:licenses(*)
      `)
      .eq('domain', domain)
      .single();
    
    console.log("Organization by domain result:", { data, error });
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getOrganizationByDomain:", error);
    logger.error({ error, domain }, 'Failed to get organization by domain');
    return null;
  }
}

// Get organization status
export async function getOrganizationStatus(organizationId: string): Promise<{
  status: 'active' | 'operational' | 'faulted' | 'suspended';
  details: Record<string, any>;
}> {
  try {
    // Check license status
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        license:licenses(*)
      `)
      .eq('id', organizationId)
      .single();

    if (orgError) throw orgError;
    
    // Check for recent errors
    const { count: errorCount, error: errorsError } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_resolved', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
      
    if (errorsError) throw errorsError;
    
    // Check for resource usage
    const { count: resourceCount, error: resourceError } = await supabase
      .from('app_monitoring_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('event_type', 'resource_limit')
      .eq('severity', 'critical')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
      
    if (resourceError) throw resourceError;
    
    // Determine status
    let status: 'active' | 'operational' | 'faulted' | 'suspended' = 'active';
    const details: Record<string, any> = {
      license_active: org.license?.is_active || false,
      license_expires_at: org.license?.expires_at,
      error_count: errorCount || 0,
      resource_issues: resourceCount || 0
    };
    
    if (!org.license?.is_active) {
      status = 'suspended';
    } else if ((errorCount || 0) > 10 || (resourceCount || 0) > 5) {
      status = 'faulted';
    } else if ((errorCount || 0) > 0 || (resourceCount || 0) > 0) {
      status = 'operational';
    }
    
    return { status, details };
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get organization status');
    return { 
      status: 'faulted', 
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } 
    };
  }
}

// Get organization error logs
export async function getOrganizationErrorLogs(
  organizationId: string,
  filters: {
    resolved?: boolean;
    severity?: 'error' | 'warning' | 'info';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<any[]> {
  try {
    let query = supabase
      .from('error_logs')
      .select(`
        *,
        user:users(id, email, name),
        resolved_by_user:users!resolved_by(id, email, name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (filters.resolved !== undefined) {
      query = query.eq('is_resolved', filters.resolved);
    }
    
    if (filters.severity) {
      query = query.eq('level', filters.severity);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error({ error, organizationId, filters }, 'Failed to get organization error logs');
    return [];
  }
}