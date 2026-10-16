import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { DashboardPage } from '../pages/DashboardPage';
import { transactionService } from '../services/transactionService';
import { authService } from '../services/authService';

vi.mock('../services/transactionService', () => ({
  transactionService: {
    getTransactions: vi.fn(),
    getTransactionById: vi.fn(),
    flagTransaction: vi.fn(),
    ingestTransactions: vi.fn(),
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

const mockTransactions = [
  {
    id: 101,
    account_id: 'ACC-88392',
    amount: 48500.0,
    currency: 'INR',
    merchant: 'CryptoX Exchange',
    transaction_type: 'transfer',
    region: 'IN-WEST',
    timestamp: '2026-10-15T10:00:00.000Z',
    risk_score: 88,
    risk_level: 'high',
    risk_factors: ['High amount for account profile', 'Unusual location region'],
    is_flagged: true,
  },
  {
    id: 102,
    account_id: 'ACC-44910',
    amount: 1240.5,
    currency: 'INR',
    merchant: 'TechGear Store',
    transaction_type: 'purchase',
    region: 'IN-NORTH',
    timestamp: '2026-10-15T11:00:00.000Z',
    risk_score: 22,
    risk_level: 'low',
    risk_factors: [],
    is_flagged: false,
  },
];

const renderDashboard = () => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 1, username: 'analyst1', role: 'analyst' })
  );

  return render(
    <AuthProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders a table of transactions with their risk scores', async () => {
    transactionService.getTransactions.mockResolvedValue({
      data: mockTransactions,
      count: mockTransactions.length,
    });

    renderDashboard();

    // Verifies transactions table renders rows
    expect(await screen.findByText('ACC-88392')).toBeInTheDocument();
    expect(screen.getByText('ACC-44910')).toBeInTheDocument();

    // Verifies transactions display their risk scores
    expect(screen.getByText('(88)')).toBeInTheDocument();
    expect(screen.getByText('(22)')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('shows a visible flag indicator for flagged transactions', async () => {
    transactionService.getTransactions.mockResolvedValue({
      data: mockTransactions,
      count: mockTransactions.length,
    });

    renderDashboard();

    await screen.findByText('ACC-88392');

    // Flagged transaction displays a visible flag indicator badge
    const flagIndicator = screen.getByText('Flagged');
    expect(flagIndicator).toBeInTheDocument();
    expect(flagIndicator.closest('.badge-status-flagged')).toBeInTheDocument();

    // Unflagged transaction displays Normal status
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('filters by status and shows only matching rows', async () => {
    transactionService.getTransactions.mockImplementation((params) => {
      let list = [...mockTransactions];
      if (params && params.is_flagged !== undefined) {
        list = list.filter((tx) => tx.is_flagged === params.is_flagged);
      }
      return Promise.resolve({ data: list, count: list.length });
    });

    renderDashboard();

    // Initially both rows appear
    expect(await screen.findByText('ACC-88392')).toBeInTheDocument();
    expect(screen.getByText('ACC-44910')).toBeInTheDocument();

    // Filter by Flag Status -> "Flagged Only" (value: "true")
    const flagStatusLabel = screen.getByText('Flag Status');
    const selectElement = flagStatusLabel.closest('.filter-item').querySelector('select');
    fireEvent.change(selectElement, { target: { value: 'true' } });

    // Only flagged transaction remains
    await waitFor(() => {
      expect(screen.queryByText('ACC-44910')).not.toBeInTheDocument();
    });
    expect(screen.getByText('ACC-88392')).toBeInTheDocument();
    expect(transactionService.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ is_flagged: true })
    );

    // Filter by Flag Status -> "Unflagged Only" (value: "false")
    fireEvent.change(selectElement, { target: { value: 'false' } });

    await waitFor(() => {
      expect(screen.queryByText('ACC-88392')).not.toBeInTheDocument();
    });
    expect(screen.getByText('ACC-44910')).toBeInTheDocument();
    expect(transactionService.getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ is_flagged: false })
    );
  });
});
