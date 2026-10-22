import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { UploadPage } from '../pages/UploadPage';
import { uploadService } from '../services/uploadService';
import { authService } from '../services/authService';

vi.mock('../services/uploadService', () => ({
  uploadService: {
    uploadCsv: vi.fn(),
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

// Synthetic dry-run response data
const mockDryRunResult = {
  dry_run: true,
  total_rows: 5,
  valid_count: 3,
  saved_count: 0,
  rejected_count: 1,
  duplicate_count: 1,
  columns: {
    matched: { acct_id: 'account_id', amt: 'amount', ccy: 'currency', vendor: 'merchant', txn_type: 'transaction_type', loc: 'region', ts: 'timestamp' },
    ignored: ['extra_col'],
    missing: [],
  },
  preview: [
    { account_id: 'SYNTH-ACC-001', amount: 9500.00, currency: 'INR', merchant: 'TestShop Alpha', transaction_type: 'purchase', region: 'IN-NORTH', timestamp: '2026-09-01T10:00:00Z' },
    { account_id: 'SYNTH-ACC-002', amount: 2200.50, currency: 'USD', merchant: 'TestShop Beta', transaction_type: 'transfer', region: 'IN-SOUTH', timestamp: '2026-09-02T11:00:00Z' },
    { account_id: 'SYNTH-ACC-003', amount: 780.00, currency: 'INR', merchant: 'TestShop Gamma', transaction_type: 'withdrawal', region: 'IN-EAST', timestamp: '2026-09-03T12:00:00Z' },
  ],
  rejected: [
    { line: 4, errors: ['amount must be a positive number', 'currency is required'] },
  ],
};

// Synthetic import response data
const mockImportResult = {
  upload_batch: 'batch-synth-abc123',
  total_rows: 5,
  saved_count: 3,
  rejected_count: 1,
  duplicate_count: 1,
  rejected: [
    { line: 4, errors: ['amount must be a positive number'] },
  ],
  columns: {
    matched: { acct_id: 'account_id', amt: 'amount' },
    ignored: [],
    missing: [],
  },
};

const createTestFile = (name = 'test-transactions.csv', size = 1024) => {
  const content = 'a'.repeat(size);
  return new File([content], name, { type: 'text/csv' });
};

const renderUploadPage = (role = 'analyst') => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 1, username: `${role}1`, role })
  );

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

const renderWithLayout = (role = 'analyst') => {
  localStorage.setItem('sentinel_token', 'test-token');
  localStorage.setItem(
    'sentinel_user',
    JSON.stringify({ id: 1, username: `${role}1`, role })
  );

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="dashboard" element={<div>Dashboard Content</div>} />
            <Route path="upload" element={<UploadPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('Upload Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Restore default getMe mock after clearAllMocks wipes it
    authService.getMe.mockResolvedValue({ id: 1, username: 'analyst1', role: 'analyst' });
  });

  describe('Navigation visibility', () => {
    it('hides Upload Data nav item for admin users', async () => {
      // Override getMe to return admin so AuthProvider keeps the admin role
      authService.getMe.mockResolvedValue({ id: 1, username: 'admin1', role: 'admin' });

      renderWithLayout('admin');

      // Wait for the layout to settle
      await waitFor(() => {
        expect(screen.getByText('Dashboard (FR-08)')).toBeInTheDocument();
      });

      // Upload Data nav link should not be present for admin
      const navLinks = screen.getAllByRole('link');
      const uploadNavLink = navLinks.find((link) => link.textContent.includes('Upload Data'));
      expect(uploadNavLink).toBeUndefined();
    });

    it('shows Upload Data nav item for analyst users', async () => {
      renderWithLayout('analyst');

      await waitFor(() => {
        expect(screen.getByText('Dashboard (FR-08)')).toBeInTheDocument();
      });

      expect(screen.getByText('Upload Data')).toBeInTheDocument();
    });
  });

  describe('Dry run results', () => {
    it('renders count cards, column report, preview rows and rejected rows after dry run', async () => {
      uploadService.uploadCsv.mockResolvedValue(mockDryRunResult);

      renderUploadPage('analyst');

      // Select a CSV file
      const fileInput = document.querySelector('input[type="file"]');
      const testFile = createTestFile();
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      // Click Check file button
      const checkBtn = await screen.findByText('Check file');
      fireEvent.click(checkBtn);

      // Wait for dry run results to appear
      // Count cards
      expect(await screen.findByText('5')).toBeInTheDocument(); // total_rows
      expect(screen.getByText('3')).toBeInTheDocument(); // valid_count

      // Column report – matched headers
      expect(screen.getByText('acct_id')).toBeInTheDocument();
      expect(screen.getByText('account_id')).toBeInTheDocument();

      // Ignored headers listed (appears in both the table and the summary text)
      const extraColElements = screen.getAllByText(/extra_col/);
      expect(extraColElements.length).toBeGreaterThanOrEqual(1);

      // Preview row data
      expect(screen.getByText('SYNTH-ACC-001')).toBeInTheDocument();
      expect(screen.getByText('SYNTH-ACC-002')).toBeInTheDocument();
      expect(screen.getByText('SYNTH-ACC-003')).toBeInTheDocument();
      expect(screen.getByText('TestShop Alpha')).toBeInTheDocument();

      // Rejected rows
      expect(screen.getByText('Line 4')).toBeInTheDocument();
      expect(screen.getByText('amount must be a positive number')).toBeInTheDocument();
      expect(screen.getByText('currency is required')).toBeInTheDocument();
    });
  });

  describe('Import button state', () => {
    it('disables the Import button when valid_count is 0', async () => {
      const zeroValidResult = {
        ...mockDryRunResult,
        valid_count: 0,
        saved_count: 0,
        preview: [],
      };
      uploadService.uploadCsv.mockResolvedValue(zeroValidResult);

      renderUploadPage('analyst');

      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [createTestFile()] } });

      fireEvent.click(await screen.findByText('Check file'));

      // Wait for the import button to appear, it should be disabled
      const importBtn = await screen.findByText('Import 0 valid rows');
      expect(importBtn.closest('button')).toBeDisabled();
    });
  });

  describe('Missing column mapping', () => {
    it('shows the mapping panel when required columns are missing', async () => {
      const missingColError = new Error('Missing required columns: region, timestamp');
      missingColError.status = 400;
      missingColError.columns = {
        matched: { acct_id: 'account_id', amt: 'amount' },
        ignored: ['location', 'date_field'],
        missing: ['region', 'timestamp'],
      };
      missingColError.error = 'Missing required columns';
      missingColError.details = null;

      uploadService.uploadCsv.mockRejectedValue(missingColError);

      renderUploadPage('analyst');

      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [createTestFile()] } });

      fireEvent.click(await screen.findByText('Check file'));

      // Wait for mapping panel to appear
      expect(await screen.findByText('Column Mapping Required')).toBeInTheDocument();

      // Missing fields should be shown as badges
      expect(screen.getByText('region')).toBeInTheDocument();
      expect(screen.getByText('timestamp')).toBeInTheDocument();

      // Ignored headers should have dropdowns for mapping
      expect(screen.getByText(/location/)).toBeInTheDocument();
      expect(screen.getByText(/date_field/)).toBeInTheDocument();

      // Re-check button should be present
      expect(screen.getByText('Re-check file with custom mapping')).toBeInTheDocument();
    });
  });

  describe('Import success', () => {
    it('shows success summary with batch ID after import', async () => {
      // First call: dry run
      uploadService.uploadCsv
        .mockResolvedValueOnce(mockDryRunResult)
        .mockResolvedValueOnce(mockImportResult);

      renderUploadPage('analyst');

      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [createTestFile()] } });

      // Run dry run
      fireEvent.click(await screen.findByText('Check file'));
      await screen.findByText('SYNTH-ACC-001');

      // Click import button
      const importBtn = await screen.findByText('Import 3 valid rows');
      fireEvent.click(importBtn);

      // Success summary should appear
      expect(await screen.findByText('Import Completed Successfully')).toBeInTheDocument();
      expect(screen.getByText('batch-synth-abc123')).toBeInTheDocument();

      // Success count cards
      expect(screen.getByText('View Uploaded Transactions')).toBeInTheDocument();
      expect(screen.getByText('Upload another file')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows file size error for 413 response', async () => {
      const err413 = new Error('File size exceeds 5 MB limit. Please upload a smaller file.');
      err413.status = 413;
      err413.columns = null;
      err413.details = null;

      uploadService.uploadCsv.mockRejectedValue(err413);

      renderUploadPage('analyst');

      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [createTestFile()] } });

      fireEvent.click(await screen.findByText('Check file'));

      // The file-too-large message should appear
      expect(
        await screen.findByText(/File size exceeds 5 MB limit/i)
      ).toBeInTheDocument();
    });
  });
});
