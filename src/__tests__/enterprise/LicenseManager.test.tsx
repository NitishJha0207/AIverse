import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LicenseManager } from '../../components/enterprise/LicenseManager';
import { useEnterprise } from '../../context/EnterpriseContext';
import { LicenseTier } from '../../types';

// Mock useEnterprise hook
vi.mock('../../context/EnterpriseContext', () => ({
  useEnterprise: vi.fn()
}));

describe('LicenseManager', () => {
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

  const mockLicense = {
    id: 'license-1',
    organization_id: 'org-1',
    tier: LicenseTier.ENTERPRISE_STANDARD,
    max_users: 50,
    current_users: 10,
    features: ['team_management', 'sso_integration', 'advanced_security'],
    issued_at: '2025-01-01T00:00:00Z',
    expires_at: '2026-01-01T00:00:00Z',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  };

  const mockRefreshOrganization = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEnterprise).mockReturnValue({
      organization: mockOrganization,
      license: mockLicense,
      users: [],
      teams: [],
      settings: null,
      loading: false,
      error: null,
      hasAccess: true,
      isAdmin: true,
      refreshOrganization: mockRefreshOrganization,
      refreshUsers: vi.fn(),
      refreshTeams: vi.fn(),
      refreshSettings: vi.fn()
    });
  });

  it('renders license information correctly', () => {
    render(<LicenseManager />);
    
    expect(screen.getByText('License Information')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Standard')).toBeInTheDocument();
    expect(screen.getByText('10 / 50')).toBeInTheDocument();
    
    // Check for features
    mockLicense.features.forEach(feature => {
      expect(screen.getByText(feature.replace(/_/g, ' '))).toBeInTheDocument();
    });
  });

  it('handles refresh correctly', async () => {
    render(<LicenseManager />);
    
    const refreshButton = screen.getByTitle('Refresh license information');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockRefreshOrganization).toHaveBeenCalled();
    });
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
      refreshOrganization: mockRefreshOrganization,
      refreshUsers: vi.fn(),
      refreshTeams: vi.fn(),
      refreshSettings: vi.fn()
    });
    
    render(<LicenseManager />);
    
    expect(screen.getByText('Organization Not Found')).toBeInTheDocument();
    expect(screen.getByText('Please set up your organization first.')).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    const onClose = vi.fn();
    render(<LicenseManager onClose={onClose} />);
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('displays license expiration information', () => {
    render(<LicenseManager />);
    
    // Format the date to match the component's formatting
    const expirationDate = new Date(mockLicense.expires_at).toLocaleDateString();
    expect(screen.getByText(expirationDate)).toBeInTheDocument();
    
    // Calculate days remaining
    const daysRemaining = Math.floor((new Date(mockLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(screen.getByText(`${daysRemaining} days remaining`)).toBeInTheDocument();
  });
});