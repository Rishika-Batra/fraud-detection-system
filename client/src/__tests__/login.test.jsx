import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
  },
}));

const renderLoginPage = () => {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows an error message on wrong credentials', async () => {
    authService.login.mockRejectedValue(new Error('Invalid username or password'));

    renderLoginPage();

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });

    // Fill in incorrect credentials
    fireEvent.change(usernameInput, { target: { value: 'wrong_analyst' } });
    fireEvent.change(passwordInput, { target: { value: 'bad_password' } });

    // Submit the form
    fireEvent.click(submitButton);

    // Verify authService.login was called with input credentials
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('wrong_analyst', 'bad_password');
    });

    // Verify error is displayed on screen
    const alertError = await screen.findByText('Invalid username or password');
    expect(alertError).toBeInTheDocument();
    expect(alertError.closest('.alert-error')).toBeInTheDocument();
  });

  it('shows fallback error message when error has no specific message', async () => {
    authService.login.mockRejectedValue({});

    renderLoginPage();

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in to dashboard/i });

    fireEvent.change(usernameInput, { target: { value: 'unknown_user' } });
    fireEvent.change(passwordInput, { target: { value: 'unknown_pass' } });

    fireEvent.click(submitButton);

    const fallbackError = await screen.findByText(
      'Authentication failed. Please check credentials.'
    );
    expect(fallbackError).toBeInTheDocument();
  });
});
