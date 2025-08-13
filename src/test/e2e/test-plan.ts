import { test, expect, describe, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { supabase } from '../../lib/supabase';

// Mock supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(), // Updated to match actual method name
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

// Test wrapper with router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

describe('End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Setup default auth mock
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    });
  });

  describe('Authentication Flow', () => {
    test('User can register successfully', async () => {
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        ...vi.mocked(supabase.from)(),
        insert: vi.fn().mockResolvedValue({ data: { id: mockUser.id }, error: null }),
        select: vi.fn().mockResolvedValue({ data: null, error: null })
      }));

      renderWithRouter(<App />);

      // Navigate to register page
      const registerLink = await screen.findByText(/create a new account/i);
      fireEvent.click(registerLink);

      // Fill registration form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const nameInput = screen.getByLabelText(/full name/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Verify registration success
      await waitFor(() => {
        expect(vi.mocked(supabase.auth.signUp)).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            data: { full_name: 'Test User' }
          }
        });
      });
    });

    test('User can login successfully', async () => {
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { 
          user: mockUser,
          session: { user: mockUser, access_token: 'test-token' }
        },
        error: null
      });

      vi.mocked(supabase.from).mockImplementation(() => ({
        ...vi.mocked(supabase.from)(),
        select: vi.fn().mockResolvedValue({ 
          data: { id: mockUser.id, email: mockUser.email },
          error: null 
        })
      }));

      renderWithRouter(<App />);

      // Navigate to login page
      const loginLink = await screen.findByText(/login/i);
      fireEvent.click(loginLink);

      // Fill login form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Verify login success
      await waitFor(() => {
        expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    test('Shows error message on login failure', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid login credentials')
      });

      renderWithRouter(<App />);

      // Navigate to login page
      const loginLink = await screen.findByText(/login/i);
      fireEvent.click(loginLink);

      // Fill login form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Settings & Shared Memory', () => {
    beforeEach(() => {
      // Mock authenticated user
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: 'test-token'
          }
        },
        error: null
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock user profile
      vi.mocked(supabase.from).mockImplementation(() => ({
        ...vi.mocked(supabase.from)(),
        select: vi.fn().mockResolvedValue({
          data: {
            id: mockUser.id,
            full_name: 'Test User',
            preferences: {
              theme: 'light',
              notifications: true
            }
          },
          error: null
        })
      }));
    });

    test('Settings modal opens and closes correctly', async () => {
      renderWithRouter(<App />);

      // Wait for auth to complete and render navbar
      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });

      // Open settings
      const settingsButton = screen.getByText(/settings/i);
      fireEvent.click(settingsButton);

      // Verify modal is open
      await waitFor(() => {
        expect(screen.getByText(/shared memory layer/i)).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByText(/shared memory layer/i)).not.toBeInTheDocument();
      });
    });

    test('Shared memory setup works correctly', async () => {
      const mockSetupResponse = { error: null };
      
      vi.mocked(supabase.from).mockImplementation(() => ({
        ...vi.mocked(supabase.from)(),
        update: vi.fn().mockResolvedValue(mockSetupResponse),
        select: vi.fn().mockResolvedValue({
          data: {
            preferences: {
              shared_memory: {
                enabled: false,
                storageQuota: 1024
              }
            }
          },
          error: null
        })
      }));

      renderWithRouter(<App />);

      // Open settings
      await waitFor(() => {
        const settingsButton = screen.getByText(/settings/i);
        fireEvent.click(settingsButton);
      });

      // Click setup button
      const setupButton = await screen.findByText(/set up/i);
      fireEvent.click(setupButton);

      // Configure shared memory
      const storageQuotaInput = await screen.findByLabelText(/storage quota/i);
      fireEvent.change(storageQuotaInput, { target: { value: '2048' } });

      const saveButton = screen.getByText(/set up shared memory/i);
      fireEvent.click(saveButton);

      // Verify setup was successful
      await waitFor(() => {
        expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('user_profiles');
      });
    });

    test('Handles shared memory setup errors gracefully', async () => {
      vi.mocked(supabase.from).mockImplementation(() => ({
        ...vi.mocked(supabase.from)(),
        update: vi.fn().mockResolvedValue({ error: new Error('Setup failed') }),
        select: vi.fn().mockResolvedValue({
          data: {
            preferences: {
              shared_memory: {
                enabled: false,
                storageQuota: 1024
              }
            }
          },
          error: null
        })
      }));

      renderWithRouter(<App />);

      // Open settings
      await waitFor(() => {
        const settingsButton = screen.getByText(/settings/i);
        fireEvent.click(settingsButton);
      });

      // Click setup button
      const setupButton = await screen.findByText(/set up/i);
      fireEvent.click(setupButton);

      // Configure shared memory
      const storageQuotaInput = await screen.findByLabelText(/storage quota/i);
      fireEvent.change(storageQuotaInput, { target: { value: '2048' } });

      const saveButton = screen.getByText(/set up shared memory/i);
      fireEvent.click(saveButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/setup failed/i)).toBeInTheDocument();
      });
    });
  });
});