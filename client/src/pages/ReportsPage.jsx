import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/ui/StatCard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Lock,
  X,
} from 'lucide-react';

export const ReportsPage = () => {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [interval, setInterval] = useState('day');
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams = {
        from: fromDate || undefined,
        to: toDate || undefined,
        interval
      };

      const [sumRes, trendRes, heatRes] = await Promise.all([
        reportService.getSummary(filterParams),
        reportService.getTrends(filterParams),
        reportService.getHeatmap(filterParams)
      ]);

      setSummary(sumRes);
      setTrends(trendRes?.points || (Array.isArray(trendRes) ? trendRes : []));
      setHeatmap(heatRes?.cells || (Array.isArray(heatRes) ? heatRes : []));
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setSummary(null);
      setTrends([]);
      setHeatmap([]);
      let msg = err.message || 'Failed to load report analytics.';
      if (err.status === 403) {
        msg = 'You do not have access to view reports';
      } else if (err.status === 404) {
        msg = 'Report data not found';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, interval]);

  const handleExport = async (format, type) => {
    setExporting(true);
    setExportError(null);
    try {
      await reportService.exportData(format, type, { from: fromDate, to: toDate });
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setExportError(err.message || `Failed to export ${type} report as ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  // Prepare chart data structures
  const riskBarData = summary ? [
    { level: 'Low Risk', count: summary.by_risk_level?.low ?? 0, fill: '#10b981' },
    { level: 'Medium Risk', count: summary.by_risk_level?.medium ?? 0, fill: '#f59e0b' },
    { level: 'High Risk', count: summary.by_risk_level?.high ?? 0, fill: '#f43f5e' },
  ] : [];

  return (
    <div className="reports-page">
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchReports} style={{ marginLeft: 'auto' }}>
            Try again
          </button>
        </div>
      )}

      {exportError && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{exportError}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setExportError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Date Filters & Controls Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="reports-filter-bar">
          <div className="filter-group">
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Time Horizon:</span>
          </div>

          <div className="filter-inputs">
            <div>
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="input"
                style={{ padding: '0.45rem 0.75rem' }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="input"
                style={{ padding: '0.45rem 0.75rem' }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Interval</label>
              <select
                className="select"
                style={{ padding: '0.45rem 0.75rem' }}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <option value="day">Daily Breakdown</option>
                <option value="week">Weekly Aggregation</option>
              </select>
            </div>

            <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={fetchReports} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Update</span>
            </button>
          </div>

          {/* Download Export Actions */}
          <div className="export-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleExport('csv', 'cases')}
              disabled={exporting}
              title="Download Cases CSV"
            >
              <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
              <span>CSV Export</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => handleExport('pdf', 'fraud_summary')}
              disabled={exporting}
              title="Download Fraud Summary PDF"
            >
              <FileText size={16} />
              <span>PDF Summary</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <RefreshCw className="spin" size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading analytics and reporting data...</p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertTriangle size={32} style={{ color: 'var(--risk-high)', marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={fetchReports}>
            Try again
          </button>
        </div>
      ) : !summary || summary.total_transactions === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BarChart3 size={32} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>No report data found for this period.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="stats-grid" style={{ marginBottom: '0.5rem' }}>
            <StatCard
              title="Total Ingest Volume"
              value={summary.total_transactions.toLocaleString()}
              subtext={`Total Value: ₹${(summary.total_amount || 0).toLocaleString('en-IN')}`}
              icon={TrendingUp}
              color="indigo"
            />
            <StatCard
              title="Flagged Transactions"
              value={summary.flagged_transactions}
              subtext={`Flagged Rate: ${(summary.flagged_rate * 100).toFixed(2)}%`}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title="Avg Risk Score"
              value={summary.average_risk_score}
              subtext="Calculated across all transactions"
              icon={BarChart3}
              color="emerald"
            />
            <StatCard
              title="Investigating Cases"
              value={summary.cases_by_status ? summary.cases_by_status.investigating : 0}
              subtext={`Resolved: ${summary.cases_by_status ? summary.cases_by_status.resolved : 0}`}
              icon={FileText}
              color="blue"
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
            Totals add amounts as recorded; no currency conversion.
          </div>

      {/* Recharts Data Visualization Grid */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Fraud Trends Line Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Fraud & Risk Trends Over Time</h3>
          <div style={{ flex: 1, minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="period" stroke="#94a3b8" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '0.75rem' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="total" name="Total Ingested" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="high_risk" name="High Risk Signals" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="flagged" name="Flagged Cases" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Bar Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Risk Distribution</h3>
          <div style={{ flex: 1, minHeight: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="level" stroke="#94a3b8" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '0.75rem' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" name="Transaction Count" radius={[6, 6, 0, 0]}>
                  {riskBarData.map((entry, index) => (
                    <Bar key={`cell-${index}`} fill={entry.fill} dataKey="count" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table (Region vs Transaction Type) */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Regional & Transaction Type Risk Heatmap</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Transaction Category</th>
                <th>Total Volume Count</th>
                <th>Avg Risk Score</th>
                <th>Risk Intensity</th>
              </tr>
            </thead>
            <tbody>
              {heatmap.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No heatmap aggregation data available for this range.
                  </td>
                </tr>
              ) : (
                heatmap.map((cell, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{cell.region}</td>
                    <td style={{ textTransform: 'capitalize' }}>{cell.transaction_type}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{cell.count}</td>
                    <td className="mono">
                      <span style={{
                        color: cell.average_risk_score > 50 ? 'var(--risk-high)' : cell.average_risk_score > 30 ? 'var(--risk-medium)' : 'var(--risk-low)',
                        fontWeight: 700
                      }}>
                        {cell.average_risk_score}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(cell.average_risk_score * 1.2, 100)}%`,
                              height: '100%',
                              background: cell.average_risk_score > 50 ? 'var(--risk-high)' : cell.average_risk_score > 30 ? 'var(--risk-medium)' : 'var(--risk-low)'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
    )}

      <style>{`
        .reports-filter-bar {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-inputs {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
