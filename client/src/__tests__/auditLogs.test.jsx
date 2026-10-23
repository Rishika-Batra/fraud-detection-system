import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { auditService } from '../services/auditService';
import { authService } from '../services/authService';

vi.mock('../services/auditService', () => ({
  auditService: {
    getLogs: vi.fn(),
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

const mockSyntheticLogs = [
  {
    id: 801,
    user_id: 10,
    action: 'SYNTHETIC_RULE_TRIGGERED',
    entity_type: 'Transaction',
    entity_id: 9001,
    details: { reason: 'Automated test signal evaluation' },
    timestamp: '2026-10-22T08:00:00.000Z',
    user: { username: 'synth_analyst' },
  },
  {
    id: 802,
    user_id: 11,
    action: 'CASE_REASSIGNMENT_EXECUTED',
    entity_type: 'Case',
    entity_id: 501,
    details: { assigned_to: 'supervisor1' },
    timestamp: '2026-10-22T09:00:00.000Z',
    user: { username: 'supervisor1' },
  },
];

const renderAuditLogsPage = (role = 'supervisor') => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 2, username: `${role}1`, role })
  );

  return render(
    <AuthProvider>
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authService.getMe.mockResolvedValue({ id: 2, username: 'supervisor1', role: 'supervisor' });
  });

  it('shows error message and Try again button when fetch fails and NO fake logs appear', async () => {
    auditService.getLogs.mockRejectedValue(
      new Error('Immutable audit storage ledger unreachable')
    );

    renderAuditLogsPage('supervisor');

    // Verify error message is shown in banner and/or table
    const errorElements = await screen.findAllByText('Immutable audit storage ledger unreachable');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);

    // Verify Try again button exists
    const tryAgainBtns = screen.getAllByRole('button', { name: /try again/i });
    expect(tryAgainBtns.length).toBeGreaterThanOrEqual(1);

    // CRITICAL: Ensure NO old hardcoded sample logs appear
    expect(screen.queryByText('LOGIN_SUCCESS')).not.toBeInTheDocument();
    expect(screen.queryByText('CASE_STATUS_UPDATED')).not.toBeInTheDocument();
    expect(screen.queryByText('REPORT_EXPORTED')).not.toBeInTheDocument();
    expect(screen.queryByText(/Presenting audit security preview/i)).not.toBeInTheDocument();

    // Verify clicking Try again refetches auditService.getLogs
    auditService.getLogs.mockResolvedValueOnce({
      data: mockSyntheticLogs,
      count: 2,
    });
    fireEvent.click(tryAgainBtns[0]);

    expect(await screen.findByText('SYNTHETIC_RULE_TRIGGERED')).toBeInTheDocument();
    expect(screen.getByText('CASE_REASSIGNMENT_EXECUTED')).toBeInTheDocument();
  });

  it('shows friendly error for 403 forbidden access', async () => {
    const error403 = new Error('Forbidden');
    error403.status = 403;
    auditService.getLogs.mockRejectedValue(error403);

    renderAuditLogsPage('analyst');

    const errorElements = await screen.findAllByText('You do not have access to view audit logs');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when API succeeds with zero audit logs', async () => {
    auditService.getLogs.mockResolvedValue({
      data: [],
      count: 0,
    });

    renderAuditLogsPage('supervisor');

    expect(await screen.findByText('No audit records found.')).toBeInTheDocument();
    expect(screen.queryByText('LOGIN_SUCCESS')).not.toBeInTheDocument();
  });

  it('renders synthetic audit log rows when fetch succeeds', async () => {
    auditService.getLogs.mockResolvedValue({
      data: mockSyntheticLogs,
      count: 2,
    });

    renderAuditLogsPage('supervisor');

    expect(await screen.findByText('SYNTHETIC_RULE_TRIGGERED')).toBeInTheDocument();
    expect(screen.getByText('#801')).toBeInTheDocument();
    expect(screen.getByText('synth_analyst')).toBeInTheDocument();
    expect(screen.getByText('CASE_REASSIGNMENT_EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('#802')).toBeInTheDocument();
  });
});
