import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ReportsPage } from '../pages/ReportsPage';
import { reportService } from '../services/reportService';
import { authService } from '../services/authService';

vi.mock('../services/reportService', () => ({
  reportService: {
    getSummary: vi.fn(),
    getTrends: vi.fn(),
    getHeatmap: vi.fn(),
    exportData: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ id: 2, username: 'supervisor1', role: 'supervisor' }),
    getUsers: vi.fn().mockResolvedValue([]),
    createUser: vi.fn(),
  },
}));

const mockSyntheticSummary = {
  total_transactions: 500,
  total_amount: 125000.0,
  flagged_transactions: 25,
  flagged_rate: 0.05,
  average_risk_score: 42,
  by_risk_level: { low: 400, medium: 75, high: 25 },
  cases_by_status: { flagged: 10, investigating: 12, resolved: 3, escalated: 0, closed: 0 },
};

const mockSyntheticTrends = {
  points: [
    { period: '2026-10-20', total: 250, flagged: 12, high_risk: 10, average_risk_score: 41 },
    { period: '2026-10-21', total: 250, flagged: 13, high_risk: 15, average_risk_score: 43 },
  ],
};

const mockSyntheticHeatmap = {
  cells: [
    { region: 'IN-NORTH', transaction_type: 'purchase', count: 300, average_risk_score: 35 },
    { region: 'EU-WEST', transaction_type: 'transfer', count: 200, average_risk_score: 52 },
  ],
};

const renderReportsPage = (role = 'supervisor') => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 2, username: `${role}1`, role })
  );

  return render(
    <AuthProvider>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authService.getMe.mockResolvedValue({ id: 2, username: 'supervisor1', role: 'supervisor' });
  });

  it('shows error message and Try again button when fetch fails and NO fake data or KPI numbers appear', async () => {
    reportService.getSummary.mockRejectedValue(
      new Error('Data warehouse aggregation engine offline')
    );
    reportService.getTrends.mockRejectedValue(
      new Error('Data warehouse aggregation engine offline')
    );
    reportService.getHeatmap.mockRejectedValue(
      new Error('Data warehouse aggregation engine offline')
    );

    renderReportsPage('supervisor');

    // Verify error message is shown in banner and/or card
    const errorElements = await screen.findAllByText('Data warehouse aggregation engine offline');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);

    // Verify Try again button exists
    const tryAgainBtns = screen.getAllByRole('button', { name: /try again/i });
    expect(tryAgainBtns.length).toBeGreaterThanOrEqual(1);

    // CRITICAL: Ensure NO old hardcoded sample summary/KPI numbers appear
    expect(screen.queryByText('1,420')).not.toBeInTheDocument();
    expect(screen.queryByText(/4850000/)).not.toBeInTheDocument();
    expect(screen.queryByText('34.5')).not.toBeInTheDocument();
    expect(screen.queryByText(/visual analytics preview/i)).not.toBeInTheDocument();

    // Verify clicking Try again refetches reporting endpoints
    reportService.getSummary.mockResolvedValueOnce(mockSyntheticSummary);
    reportService.getTrends.mockResolvedValueOnce(mockSyntheticTrends);
    reportService.getHeatmap.mockResolvedValueOnce(mockSyntheticHeatmap);
    fireEvent.click(tryAgainBtns[0]);

    expect(await screen.findByText('500')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows friendly error for 403 forbidden access', async () => {
    const error403 = new Error('Forbidden');
    error403.status = 403;
    reportService.getSummary.mockRejectedValue(error403);
    reportService.getTrends.mockRejectedValue(error403);
    reportService.getHeatmap.mockRejectedValue(error403);

    renderReportsPage('analyst');

    const errorElements = await screen.findAllByText('You do not have access to view reports');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when API succeeds with zero transactions', async () => {
    reportService.getSummary.mockResolvedValue({
      total_transactions: 0,
      total_amount: 0,
      flagged_transactions: 0,
      flagged_rate: 0,
      average_risk_score: 0,
      by_risk_level: { low: 0, medium: 0, high: 0 },
      cases_by_status: { flagged: 0, investigating: 0, resolved: 0, escalated: 0, closed: 0 },
    });
    reportService.getTrends.mockResolvedValue({ points: [] });
    reportService.getHeatmap.mockResolvedValue({ cells: [] });

    renderReportsPage('supervisor');

    expect(
      await screen.findByText('No report data found for this period.')
    ).toBeInTheDocument();
    // Verify no charts or old sample stats appear
    expect(screen.queryByText('1,420')).not.toBeInTheDocument();
  });

  it('renders synthetic analytics and currency note when fetch succeeds', async () => {
    reportService.getSummary.mockResolvedValue(mockSyntheticSummary);
    reportService.getTrends.mockResolvedValue(mockSyntheticTrends);
    reportService.getHeatmap.mockResolvedValue(mockSyntheticHeatmap);

    renderReportsPage('supervisor');

    expect(await screen.findByText('500')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(
      screen.getByText('Totals add amounts as recorded; no currency conversion.')
    ).toBeInTheDocument();
  });

  it('shows error banner when report export action fails', async () => {
    reportService.getSummary.mockResolvedValue(mockSyntheticSummary);
    reportService.getTrends.mockResolvedValue(mockSyntheticTrends);
    reportService.getHeatmap.mockResolvedValue(mockSyntheticHeatmap);
    reportService.exportData.mockRejectedValue(new Error('Export rendering pipeline failed'));

    renderReportsPage('supervisor');

    expect(await screen.findByText('500')).toBeInTheDocument();

    const pdfBtn = screen.getByRole('button', { name: /pdf summary/i });
    fireEvent.click(pdfBtn);

    expect(
      await screen.findByText(/Export rendering pipeline failed/i)
    ).toBeInTheDocument();
  });
});
