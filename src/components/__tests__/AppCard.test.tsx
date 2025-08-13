import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppCard from '../AppCard';
import { useAuth } from '../../context/AuthContext';
import { useAppInstallation } from '../../hooks/useAppInstallation';
import { useEnterprise } from '../../context/EnterpriseContext';

// Mock hooks
vi.mock('../../context/AuthContext');
vi.mock('../../hooks/useAppInstallation');
vi.mock('../../context/EnterpriseContext');
vi.mock('../../lib/appTracking', () => ({
  trackAppBehavior: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('../../lib/navigationStateMachine', () => ({
  useNavigationStore: () => ({
    startNavigation: vi.fn(),
    currentState: 'idle'
  })
}));

describe('AppCard', () => {
  const mockApp = {
    id: 'test-app',
    name: 'Test App',
    description: 'Test Description',
    short_description: 'Short Description',
    developer_name: 'Test Developer',
    price: 0,
    rating: 4.5,
    reviews_count: 100,
    icon_url: 'test-icon.png',
    tags: ['test', 'app'],
    is_available: true,
    is_native: true,
    version: '1.0.0',
    created_at: '2025-02-19',
    updated_at: '2025-02-19'
  };

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        isAuthenticated: true,
        user: { id: 'test-user' },
        loading: false,
        error: null
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn()
    });

    vi.mocked(useAppInstallation).mockReturnValue({
      installations: {},
      installing: {},
      progress: {},
      installApp: vi.fn(),
      uninstallApp: vi.fn(),
      getStatus: vi.fn().mockResolvedValue(null),
      subscribeToProgress: vi.fn(),
      installedApps: []
    });

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
  });

  it('should render app details correctly', () => {
    render(
      <BrowserRouter>
        <AppCard app={mockApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    expect(screen.getByText(mockApp.name)).toBeInTheDocument();
    expect(screen.getByText(mockApp.developer_name)).toBeInTheDocument();
    expect(screen.getByText(mockApp.short_description)).toBeInTheDocument();
  });

  it('should show install button for free app', () => {
    render(
      <BrowserRouter>
        <AppCard app={mockApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Free');
  });

  it('should show price for paid app', () => {
    const paidApp = { ...mockApp, price: 9.99 };
    render(
      <BrowserRouter>
        <AppCard app={paidApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('$9.99');
  });

  it('should handle installation', async () => {
    const installApp = vi.fn();
    vi.mocked(useAppInstallation).mockReturnValue({
      ...vi.mocked(useAppInstallation)(),
      installApp
    });

    render(
      <BrowserRouter>
        <AppCard app={mockApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(installApp).toHaveBeenCalledWith(mockApp);
    });
  });

  it('should show external store link for external app', () => {
    const externalApp = {
      ...mockApp,
      store_url: 'https://example.com',
      original_store: 'Test Store'
    };

    render(
      <BrowserRouter>
        <AppCard app={externalApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent(`Get on ${externalApp.original_store}`);
  });

  it('should show installed status', async () => {
    vi.mocked(useAppInstallation).mockReturnValue({
      ...vi.mocked(useAppInstallation)(),
      getStatus: vi.fn().mockResolvedValue({ status: 'installed', progress: 100 })
    });

    render(
      <BrowserRouter>
        <AppCard app={mockApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });
  });

  it('should show installation progress', async () => {
    vi.mocked(useAppInstallation).mockReturnValue({
      ...vi.mocked(useAppInstallation)(),
      progress: {
        [mockApp.id]: { status: 'downloading', progress: 50 }
      }
    });

    render(
      <BrowserRouter>
        <AppCard app={mockApp as any} viewMode="grid" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });
  });
});