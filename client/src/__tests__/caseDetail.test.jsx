import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CaseDetailPage } from '../pages/CaseDetailPage';
import { caseService } from '../services/caseService';
import { authService } from '../services/authService';

vi.mock('../services/caseService', () => ({
  caseService: {
    getCases: vi.fn(),
    getCaseById: vi.fn(),
    updateStatus: vi.fn(),
    addNote: vi.fn(),
    assignCase: vi.fn(),
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

const mockCase = {
  id: 1,
  transaction_id: 101,
  assigned_to: 1,
  status: 'flagged',
  created_at: '2026-10-15T10:00:00.000Z',
  assignee: { id: 1, username: 'analyst1', role: 'analyst' },
  transaction: {
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
    risk_factors: [
      'High amount for account profile',
      'Unusual location region',
      'Rapid velocity transfer',
    ],
  },
  CaseNotes: [
    {
      id: 1,
      note: 'Initial automated flag triggered by scoring engine rule #4.',
      created_at: '2026-10-15T10:05:00.000Z',
      author: { username: 'System Engine' },
    },
    {
      id: 2,
      note: 'Opened investigation. Verification request sent to cardholder.',
      created_at: '2026-10-15T10:30:00.000Z',
      author: { username: 'analyst1' },
    },
  ],
};

const renderCaseDetail = (caseId = 1) => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 1, username: 'analyst1', role: 'analyst' })
  );

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
        <Routes>
          <Route path="/cases/:id" element={<CaseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('CaseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('opening a case shows its details and notes', async () => {
    caseService.getCaseById.mockResolvedValue(mockCase);

    renderCaseDetail(1);

    // Case Header
    expect(await screen.findByText('Case Workspace #1')).toBeInTheDocument();
    expect(screen.getByText('flagged')).toBeInTheDocument();

    // Linked Transaction Details
    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('ACC-88392')).toBeInTheDocument();
    expect(screen.getByText(/48,500/)).toBeInTheDocument();
    expect(screen.getByText(/CryptoX Exchange/)).toBeInTheDocument();
    expect(screen.getByText('(88)')).toBeInTheDocument();
    expect(screen.getByText('High amount for account profile')).toBeInTheDocument();
    expect(screen.getByText('Unusual location region')).toBeInTheDocument();

    // Investigation Notes
    expect(
      screen.getByText('Initial automated flag triggered by scoring engine rule #4.')
    ).toBeInTheDocument();
    expect(screen.getByText('System Engine')).toBeInTheDocument();
    expect(
      screen.getByText('Opened investigation. Verification request sent to cardholder.')
    ).toBeInTheDocument();
    expect(screen.getByText('analyst1')).toBeInTheDocument();
  });

  it('changing a case status calls the API and updates the screen', async () => {
    // Initial fetch returns flagged status, next fetch returns updated investigating status
    caseService.getCaseById
      .mockResolvedValueOnce(mockCase)
      .mockResolvedValueOnce({
        ...mockCase,
        status: 'investigating',
      });

    caseService.updateStatus.mockResolvedValue({
      id: 1,
      status: 'investigating',
    });

    renderCaseDetail(1);

    // Initial button to transition status from flagged -> investigating
    const startInvestigationBtn = await screen.findByRole('button', {
      name: /start investigation/i,
    });
    expect(startInvestigationBtn).toBeInTheDocument();

    // Trigger status transition
    fireEvent.click(startInvestigationBtn);

    // Verifies the API was called with the expected case ID and new status
    await waitFor(() => {
      expect(caseService.updateStatus).toHaveBeenCalledWith(
        '1',
        'investigating',
        expect.stringContaining('investigating')
      );
    });

    // Verifies the screen updates with success feedback and updated status badge
    expect(
      await screen.findByText(/Case workflow status updated to "INVESTIGATING" successfully/i)
    ).toBeInTheDocument();
    expect(screen.getByText('investigating')).toBeInTheDocument();

    // Verifies the action controls reflect the new "investigating" state
    expect(screen.getByRole('button', { name: /resolve case/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /escalate to supervisor/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /start investigation/i })
    ).not.toBeInTheDocument();
  });
});
