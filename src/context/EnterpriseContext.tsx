import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { 
  Organization, 
  License, 
  LicenseTier, 
  OrganizationUser,
  Team,
  EnterpriseSettings
} from '../types';
import { 
  getUserOrganization, 
  checkEnterpriseAccess,
  getOrganizationUsers,
  getOrganizationTeams,
  getEnterpriseSettings,
  getOrganizationByDomain
} from '../lib/enterprise';
import { logger } from '../lib/logging';

interface EnterpriseContextType {
  organization: Organization | null;
  license: License | null;
  users: OrganizationUser[];
  teams: Team[];
  settings: EnterpriseSettings | null;
  loading: boolean;
  error: string | null;
  hasAccess: boolean;
  isAdmin: boolean;
  refreshOrganization: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  getOrganizationByDomain: (domain: string) => Promise<Organization | null>;
}

const EnterpriseContext = createContext<EnterpriseContextType | null>(null);

export const EnterpriseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [settings, setSettings] = useState<EnterpriseSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Initialize enterprise context
  useEffect(() => {
    const initializeEnterprise = async () => {
      if (!auth.isAuthenticated || !auth.user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get user's organization
        const org = await getUserOrganization(auth.user.id);
        setOrganization(org);

        if (org) {
          // Check if user has enterprise access
          const access = await checkEnterpriseAccess(auth.user.id);
          setHasAccess(access);

          // Check if user is admin
          const isOrgAdmin = org.admin_user_id === auth.user.id || 
                            await supabase
                              .from('organization_users')
                              .select('role')
                              .eq('organization_id', org.id)
                              .eq('user_id', auth.user.id)
                              .eq('role', 'admin')
                              .maybeSingle()
                              .then(res => !!res.data);
          setIsAdmin(isOrgAdmin);

          // Get license details
          if (org.license_id) {
            const { data: licenseData, error: licenseError } = await supabase
              .from('licenses')
              .select('*')
              .eq('id', org.license_id)
              .single();

            if (licenseError) throw licenseError;
            setLicense(licenseData);
          }

          // Get organization users
          const orgUsers = await getOrganizationUsers(org.id);
          setUsers(orgUsers);

          // Get organization teams
          const orgTeams = await getOrganizationTeams(org.id);
          setTeams(orgTeams);

          // Get enterprise settings
          const orgSettings = await getEnterpriseSettings(org.id);
          setSettings(orgSettings);
        } else {
          setHasAccess(false);
          setIsAdmin(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize enterprise context';
        setError(errorMessage);
        logger.error({ error: err }, 'Enterprise context initialization error');
      } finally {
        setLoading(false);
      }
    };

    initializeEnterprise();
  }, [auth.isAuthenticated, auth.user]);

  // Refresh organization data
  const refreshOrganization = async () => {
    if (!auth.isAuthenticated || !auth.user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const org = await getUserOrganization(auth.user.id);
      setOrganization(org);
      
      if (org?.license_id) {
        const { data: licenseData, error: licenseError } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', org.license_id)
          .single();

        if (licenseError) throw licenseError;
        setLicense(licenseData);
      }
      
      // Update access status
      const access = await checkEnterpriseAccess(auth.user.id);
      setHasAccess(access);
      
      // Update admin status
      if (org) {
        const isOrgAdmin = org.admin_user_id === auth.user.id || 
                          await supabase
                            .from('organization_users')
                            .select('role')
                            .eq('organization_id', org.id)
                            .eq('user_id', auth.user.id)
                            .eq('role', 'admin')
                            .maybeSingle()
                            .then(res => !!res.data);
        setIsAdmin(isOrgAdmin);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh organization';
      setError(errorMessage);
      logger.error({ error: err }, 'Failed to refresh organization');
    } finally {
      setLoading(false);
    }
  };

  // Refresh organization users
  const refreshUsers = async () => {
    if (!organization) return;
    
    try {
      const orgUsers = await getOrganizationUsers(organization.id);
      setUsers(orgUsers);
    } catch (err) {
      logger.error({ error: err }, 'Failed to refresh organization users');
    }
  };

  // Refresh organization teams
  const refreshTeams = async () => {
    if (!organization) return;
    
    try {
      const orgTeams = await getOrganizationTeams(organization.id);
      setTeams(orgTeams);
    } catch (err) {
      logger.error({ error: err }, 'Failed to refresh organization teams');
    }
  };

  // Refresh enterprise settings
  const refreshSettings = async () => {
    if (!organization) return;
    
    try {
      const orgSettings = await getEnterpriseSettings(organization.id);
      setSettings(orgSettings);
    } catch (err) {
      logger.error({ error: err }, 'Failed to refresh enterprise settings');
    }
  };

  // Get organization by domain
  const getOrgByDomain = async (domain: string): Promise<Organization | null> => {
    try {
      return await getOrganizationByDomain(domain);
    } catch (err) {
      logger.error({ error: err, domain }, 'Failed to get organization by domain');
      return null;
    }
  };

  return (
    <EnterpriseContext.Provider
      value={{
        organization,
        license,
        users,
        teams,
        settings,
        loading,
        error,
        hasAccess,
        isAdmin,
        refreshOrganization,
        refreshUsers,
        refreshTeams,
        refreshSettings,
        getOrganizationByDomain: getOrgByDomain
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  );
};

export const useEnterprise = () => {
  const context = useContext(EnterpriseContext);
  if (!context) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider');
  }
  return context;
};