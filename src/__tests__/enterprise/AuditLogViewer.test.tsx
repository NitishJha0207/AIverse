import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogViewer } from '../../components/enterprise/AuditLogViewer';
import { useEnterprise } from '../../context/EnterpriseContext';
import * as enterpriseLib from '../../lib/enterprise';

// Mock useEnterprise hook
vi.mock('../../context/EnterpriseContext', () => ({
  useEnterprise: vi.fn()
}));

// Mock enterprise library
vi.mock('../../lib/enterprise', () => ({
  getAuditLogs: vi.fn()
}));

describe('AuditLogViewer', () => {
  const mockOrganization = {
    id: 'org-1',
    name: 'Test Organization',
    domain: 'test.com',
    admin_user_id: 'user-1',
    license_id: 'license-1',
    sso_enabled: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  };

  const mockUsers = [
    {
      id: 'ou-1',
      organization_id: 'org-1',
      user_id: 'user-1',
      role: 'admin',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user: {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin User'
      }
    },
    {
      id: 'ou-2',
      organization_id: 'org-1',
      user_id: 'user-2',
      role: 'user',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user: {
        id: 'user-2',
        email: 'user@test.com',
        name: 'Regular User'
      }
    }
  ];

  const mockAuditLogs = [
    {
      id: 'log-1',
      organization_id: 'org-1',
      user_id: 'user-1',
      action: 'user_added',
      resource_type: 'organization_users',
      resource_id: 'ou-2',
      details: { email: 'user@test.com', role: 'user' },
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: '2025-01-01T12:00:00Z',
      user: {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin User'
      }
    },
    {
      id: 'log-2',
      organization_id: 'org-1',
      user_id: 'user-1',
      action: 'settings_updated',
      resource_type: 'enterprise_settings',
      resource_id: 'org-1',
      details: { changes: { security_policy: { mfa_required: true } } },
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      created_at: '2025-01-01T13:00:00Z',
      user: {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin User'
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEnterprise).mockReturnValue({
      organization: mockOrganization,
      license: null,
      users: mockUsers,
      teams: [],
      settings: null,
      loading: false,
      error: null,
      hasAccess: true,
      isAdmin: true,
      refreshOrganization: vi.fn(),
      refreshUsers: vi.fn(),
      refreshTeams: vi.fn(),
      refreshSettings: vi.fn()
    });
    vi.mocked(enterpriseLib.getAuditLogs).mockResolvedValue(mockAuditLogs);
  });

  it('renders audit logs correctly', async () => {
    render(<AuditLogViewer />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(enterpriseLib.getAuditLogs).toHaveBeenCalledWith('org-1', expect.any(Object));
    });
    
    // Check if logs are displayed
    expect(screen.getByText('user_added')).toBeInTheDocument();
    expect(screen.getByText('settings_updated')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('handles search filtering', async () => {
    render(<AuditLogViewer />);
    
    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText('user_added')).toBeInTheDocument();
    });
    
    // Search for 'settings'
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'settings' } });
    
    // Only settings_updated should be visible
    expect(screen.queryByText('user_added')).not.toBeInTheDocument();
    expect(screen.getByText('settings_updated')).toBeInTheDocument();
  });

  it('shows error message when organization is not found', () => {
    vi.mocked(useEnterprise).mockReturnValue({
      organization: null,
      license: null,
      users: [],
      teams: [],
      settings: null,
      loading: false,
      error: null,
      hasAccess: false,
      isAdmin: false,
      refreshOrganization: vi.fn(),
      refreshUsers: vi.fn(),
      refreshTeams: vi.fn(),
      refreshSettings: vi.fn()
    });
    
    render(<AuditLogViewer />);
    
    expect(screen.getByText('Organization Not Found')).toBeInTheDocument();
    expect(screen.getByText('Please set up your organization first.')).toBeInTheDocument();
  });
});