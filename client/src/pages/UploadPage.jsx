import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../utils/formatters';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  FileCheck,
  FileX,
  Layers,
  Copy,
  Sliders,
} from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const CANONICAL_FIELDS = [
  'account_id',
  'amount',
  'currency',
  'merchant',
  'transaction_type',
  'region',
  'timestamp',
];

export const UploadPage = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  // File selection state
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  // Operation states
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);

  // Dry run and import response data
  const [dryRunResult, setDryRunResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Column mapping states for missing columns
  const [missingColumns, setMissingColumns] = useState([]);
  const [ignoredColumns, setIgnoredColumns] = useState([]);
  const [mapping, setMapping] = useState({});

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setFileError('Invalid file format. Please choose a file ending in .csv');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds the 5 MB limit. Please select a smaller CSV file.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setFileError(null);
    setError(null);
    setDryRunResult(null);
    setImportResult(null);
    setMissingColumns([]);
    setIgnoredColumns([]);
    setMapping({});
  };

  const handleCheckFile = async () => {
    if (!file) return;

    setIsChecking(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (Object.keys(mapping).length > 0) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    try {
      const res = await uploadService.uploadCsv(formData, { dry_run: true });
      setDryRunResult(res);
      setMissingColumns([]);
      setIgnoredColumns(res?.columns?.ignored || []);
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }

      if (err.status === 413) {
        setError({
          status: 413,
          message: 'File size exceeds 5 MB limit. Please upload a smaller file.',
        });
      } else if (err.status === 403) {
        setError({
          status: 403,
          message: 'Access denied: Only analysts and supervisors are permitted to upload transaction files.',
        });
      } else if (err.columns?.missing && err.columns.missing.length > 0) {
        setMissingColumns(err.columns.missing);
        setIgnoredColumns(err.columns.ignored || []);
        setError({
          status: 400,
          message: err.message || err.error || 'Missing required columns in CSV',
          details: err.details,
          columns: err.columns,
        });
      } else {
        setError({
          status: err.status || 400,
          message: err.message || err.error || 'Failed to inspect CSV file',
          details: err.details,
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleImport = async () => {
    if (!file || !dryRunResult || dryRunResult.valid_count === 0) return;

    setIsImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (Object.keys(mapping).length > 0) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    try {
      const res = await uploadService.uploadCsv(formData, { dry_run: false });
      setImportResult(res);
      setDryRunResult(null);
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      if (err.status === 403) {
        setError({
          status: 403,
          message: 'Access denied: Only analysts and supervisors are permitted to upload transaction files.',
        });
      } else if (err.status === 413) {
        setError({
          status: 413,
          message: 'File size exceeds 5 MB limit.',
        });
      } else {
        setError({
          status: err.status || 500,
          message: err.message || err.error || 'Import failed',
          details: err.details,
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleMappingChange = (header, canonicalField) => {
    setMapping((prev) => {
      const updated = { ...prev };
      if (!canonicalField) {
        delete updated[header];
      } else {
        updated[header] = canonicalField;
      }
      return updated;
    });
  };

  const handleReset = () => {
    setFile(null);
    setFileError(null);
    setDryRunResult(null);
    setImportResult(null);
    setError(null);
    setMissingColumns([]);
    setIgnoredColumns([]);
    setMapping({});
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Blocked for admin role
  if (!hasRole('analyst', 'supervisor')) {
    return (
      <div className="glass-card" style={{ maxWidth: '700px', margin: '3rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--risk-high)', margin: '0 auto 1rem' }} />
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Only analysts and supervisors are permitted to upload transaction data.
        </p>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="upload-page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <UploadCloud size={28} style={{ color: 'var(--primary)' }} />
          <h2>Bulk CSV Transaction Upload</h2>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Ingest batches of financial transactions with automated header matching, strict data validation, duplicate detection, and live fraud scoring.
        </p>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="error-banner" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={20} style={{ color: '#fca5a5', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#fca5a5' }}>{error.message}</strong>
              {error.details && Array.isArray(error.details) && (
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#fecaca' }}>
                  {error.details.map((d, idx) => (
                    <li key={idx}>{typeof d === 'string' ? d : JSON.stringify(d)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS STATE */}
      {importResult && (
        <div className="glass-card success-card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="success-icon-wrap">
              <CheckCircle size={32} style={{ color: '#34d399' }} />
            </div>
            <div>
              <h3 style={{ color: '#34d399', fontSize: '1.4rem' }}>Import Completed Successfully</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Batch ID: <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{importResult.upload_batch}</span>
              </p>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-box">
              <span className="stat-label">Total Rows</span>
              <span className="stat-val">{importResult.total_rows}</span>
            </div>
            <div className="stat-box stat-saved">
              <span className="stat-label">Saved</span>
              <span className="stat-val">{importResult.saved_count}</span>
            </div>
            <div className="stat-box stat-duplicates">
              <span className="stat-label">Duplicates Skipped</span>
              <span className="stat-val">{importResult.duplicate_count}</span>
            </div>
            <div className="stat-box stat-rejected">
              <span className="stat-label">Rejected</span>
              <span className="stat-val">{importResult.rejected_count}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/dashboard?source=uploaded" className="btn btn-primary">
              <span>View Uploaded Transactions</span>
              <ArrowRight size={16} />
            </Link>
            <button onClick={handleReset} className="btn btn-secondary">
              <RotateCcw size={16} />
              <span>Upload another file</span>
            </button>
          </div>
        </div>
      )}

      {/* FILE SELECTION CARD (hidden once import is complete) */}
      {!importResult && (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Step 1: Select CSV File</h3>

          <div className="file-drop-zone">
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="csv-file-input" className="file-drop-label">
              <UploadCloud size={44} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
                {file ? file.name : 'Click to browse or drop your CSV file here'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                {file ? formatFileSize(file.size) : 'Maximum file size 5 MB (.csv format only)'}
              </div>
            </label>
          </div>

          {fileError && (
            <div style={{ marginTop: '0.75rem', color: 'var(--risk-high)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{fileError}</span>
            </div>
          )}

          {file && !fileError && (
            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleCheckFile}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="spin" size={16} />
                    <span>Checking file...</span>
                  </>
                ) : (
                  <>
                    <FileCheck size={16} />
                    <span>Check file</span>
                  </>
                )}
              </button>

              <button className="btn btn-secondary" onClick={handleReset}>
                <X size={16} />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MISSING COLUMNS / CUSTOM MAPPING PANEL */}
      {missingColumns.length > 0 && !importResult && (
        <div className="glass-card warning-card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertTriangle size={24} style={{ color: 'var(--risk-medium)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--risk-medium)', fontSize: '1.1rem' }}>Column Mapping Required</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                The following required canonical field(s) were missing from auto-detection:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {missingColumns.map((col) => (
                  <span key={col} className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.75rem' }}>
              Map CSV headers to canonical fields:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {ignoredColumns.map((header) => (
                <div key={header} className="mapping-item">
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                    Header: <span className="mono" style={{ color: 'var(--text-main)' }}>"{header}"</span>
                  </label>
                  <select
                    className="select"
                    value={mapping[header] || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Do not map --</option>
                    {CANONICAL_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {field} {missingColumns.includes(field) ? '(Required)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCheckFile}
              disabled={isChecking}
            >
              <Sliders size={16} />
              <span>Re-check file with custom mapping</span>
            </button>
          </div>
        </div>
      )}

      {/* DRY RUN RESULTS SECTION */}
      {dryRunResult && !importResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Count Cards */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Inspection Summary</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">Total Rows</span>
                <span className="stat-val">{dryRunResult.total_rows}</span>
              </div>
              <div className="stat-box stat-saved">
                <span className="stat-label">Valid Rows</span>
                <span className="stat-val">{dryRunResult.valid_count}</span>
              </div>
              <div className="stat-box stat-duplicates">
                <span className="stat-label">Duplicates</span>
                <span className="stat-val">{dryRunResult.duplicate_count}</span>
              </div>
              <div className="stat-box stat-rejected">
                <span className="stat-label">Rejected</span>
                <span className="stat-val">{dryRunResult.rejected_count}</span>
              </div>
            </div>
          </div>

          {/* Import Action Banner */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>
                Ready to Import Transactions
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {dryRunResult.valid_count > 0
                  ? `${dryRunResult.valid_count} valid row(s) will be ingested, scored for fraud risk, and checked for cases.`
                  : 'No valid rows found to import.'}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={dryRunResult.valid_count === 0 || isImporting}
              style={{ minWidth: '180px' }}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="spin" size={16} />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Import {dryRunResult.valid_count} valid rows</span>
                </>
              )}
            </button>
          </div>

          {/* Column Matching Report */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Column Mapping Report</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CSV Header</th>
                    <th>Matched Canonical Field</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dryRunResult.columns?.matched || {}).map(([rawHeader, field]) => (
                    <tr key={rawHeader}>
                      <td className="mono" style={{ fontWeight: 600 }}>{rawHeader}</td>
                      <td className="mono" style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{field}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(79, 214, 160, 0.12)', color: 'var(--green)', border: '1px solid rgba(79, 214, 160, 0.3)' }}>
                          Matched
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(dryRunResult.columns?.ignored || []).map((rawHeader) => (
                    <tr key={rawHeader}>
                      <td className="mono" style={{ color: 'var(--text-soft)' }}>{rawHeader}</td>
                      <td style={{ color: 'var(--text-soft)' }}>—</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          Ignored
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(dryRunResult.columns?.ignored || []).length > 0 && (
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Ignored headers: </strong>
                {dryRunResult.columns.ignored.join(', ')}
              </div>
            )}
          </div>

          {/* Preview Rows Table */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Preview Valid Rows (First {dryRunResult.preview?.length || 0})</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Merchant</th>
                    <th>Type</th>
                    <th>Region</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRunResult.preview?.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No valid rows available.
                      </td>
                    </tr>
                  ) : (
                    dryRunResult.preview?.map((row, idx) => (
                      <tr key={idx}>
                        <td className="mono" style={{ fontWeight: 600 }}>{row.account_id}</td>
                        <td style={{ fontWeight: 700 }}>
                          {formatMoney(row.amount, row.currency)}
                        </td>
                        <td>{row.currency}</td>
                        <td>{row.merchant}</td>
                        <td style={{ textTransform: 'capitalize' }}>{row.transaction_type}</td>
                        <td>{row.region}</td>
                        <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rejected Rows Table */}
          {dryRunResult.rejected && dryRunResult.rejected.length > 0 && (
            <div className="glass-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileX size={20} style={{ color: 'var(--risk-high)' }} />
                <h3 style={{ fontSize: '1.05rem', color: 'var(--risk-high)' }}>
                  Rejected Rows ({dryRunResult.rejected.length})
                </h3>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>CSV Line</th>
                      <th>Validation Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dryRunResult.rejected.map((item, idx) => (
                      <tr key={idx}>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--risk-high)' }}>
                          Line {item.line}
                        </td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                            {item.errors.map((err, eIdx) => (
                              <li key={eIdx}>{err}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scoped Styles */}
      <style>{`
        .upload-page-container {
          max-width: 1300px;
          margin: 0 auto;
        }

        .file-drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          background: var(--surface);
          transition: border-color 0.2s, background-color 0.2s;
        }
        .file-drop-zone:hover {
          border-color: var(--gold);
          background: var(--surface-2);
        }

        .file-drop-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          cursor: pointer;
        }

        .error-banner {
          background: var(--danger-bg);
          border: 1px solid var(--danger);
          border-radius: var(--radius-sm);
          padding: 1rem 1.25rem;
        }

        .warning-card {
          background: var(--amber-bg);
          border-color: var(--gold-border);
        }

        .success-card {
          background: rgba(79, 214, 160, 0.08);
          border-color: rgba(79, 214, 160, 0.3);
          padding: 2rem;
        }

        .success-icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: rgba(79, 214, 160, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-box {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .stat-label {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .stat-val {
          font-family: var(--font-mono);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-bright);
        }
        .stat-saved .stat-val { color: var(--green); }
        .stat-duplicates .stat-val { color: var(--gold-light); }
        .stat-rejected .stat-val { color: var(--danger); }

        .mapping-item {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default UploadPage;
