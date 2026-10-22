import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CasesPage } from '../pages/CasesPage';
import { caseService } from '../services/caseService';
import { authService } from '../services/authService';

vi.mock('../services/caseService', () => ({
  caseService: {
    getCases: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ id: 1, username: 'analyst1', role: 'analyst' }),
    getUsers: vi.fn().mockResolvedValue([]),
    createUser: vi.fn(),
  },
}));

const mockSyntheticCases = [
  {
    id: 501,
    transaction_id: 9001,
    status: 'flagged',
    assigned_to: null,
    created_at: '2026-10-20T10:00:00.000Z',
    transaction: {
      id: 9001,
      amount: 15000.0,
      currency: 'INR',
      risk_score: 85,
      risk_level: 'high',
      region: 'IN-NORTH',
    },
  },
  {
    id: 502,
    transaction_id: 9002,
    status: 'investigating',
    assigned_to: 1,
    assignee: { username: 'synthetic_analyst' },
    created_at: '2026-10-20T11:00:00.000Z',
    transaction: {
      id: 9002,
      amount: 450.0,
      currency: 'EUR',
      risk_score: 45,
      risk_level: 'medium',
      region: 'EU-WEST',
    },
  },
];

const renderCasesPage = () => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 1, username: 'analyst1', role: 'analyst' })
  );

  return render(
    <AuthProvider>
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('CasesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authService.getMe.mockResolvedValue({ id: 1, username: 'analyst1', role: 'analyst' });
  });

  it('shows the error message and Try again button when fetch fails and NO sample cases appear', async () => {
    caseService.getCases.mockRejectedValue(
      new Error('Network error: Database service unreachable')
    );

    renderCasesPage();

    // Verify error message is shown in banner and/or table
    const errorElements = await screen.findAllByText('Network error: Database service unreachable');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);

    // Verify Try again button exists
    const tryAgainBtns = screen.getAllByRole('button', { name: /try again/i });
    expect(tryAgainBtns.length).toBeGreaterThanOrEqual(1);

    // CRITICAL: Ensure NO old hardcoded sample cases appear in the UI
    expect(screen.queryByText(/CASE-#1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CASE-#2/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CASE-#3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CryptoX Exchange/)).not.toBeInTheDocument();
    expect(screen.queryByText(/rishika_analyst/)).not.toBeInTheDocument();
    expect(screen.queryByText(/supervisor_raj/)).not.toBeInTheDocument();

    // Verify clicking Try again triggers fetchCases again
    caseService.getCases.mockResolvedValueOnce({
      data: mockSyntheticCases,
      count: 2,
    });
    fireEvent.click(tryAgainBtns[0]);

    expect(await screen.findByText('CASE-#501')).toBeInTheDocument();
    expect(screen.getByText('CASE-#502')).toBeInTheDocument();
  });

  it('shows friendly error for 403 forbidden access', async () => {
    const error403 = new Error('Forbidden');
    error403.status = 403;
    caseService.getCases.mockRejectedValue(error403);

    renderCasesPage();

    const errorElements = await screen.findAllByText('You do not have access to this case');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows proper empty state when the API succeeds with zero cases', async () => {
    caseService.getCases.mockResolvedValue({
      data: [],
      count: 0,
    });

    renderCasesPage();

    expect(
      await screen.findByText('No active investigation cases match this filter.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/CASE-#/)).not.toBeInTheDocument();
  });

  it('renders synthetic cases when fetch succeeds', async () => {
    caseService.getCases.mockResolvedValue({
      data: mockSyntheticCases,
      count: 2,
    });

    renderCasesPage();

    expect(await screen.findByText('CASE-#501')).toBeInTheDocument();
    expect(screen.getByText('#9001')).toBeInTheDocument();
    expect(screen.getByText('CASE-#502')).toBeInTheDocument();
    expect(screen.getByText('#9002')).toBeInTheDocument();
    expect(screen.getByText('synthetic_analyst')).toBeInTheDocument();
  });
});
