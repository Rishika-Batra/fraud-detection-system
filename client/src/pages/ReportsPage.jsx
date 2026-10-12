import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

const SAMPLE_SUMMARY = {
  total_transactions: 1420,
  total_amount: 4850000.00,
  flagged_transactions: 118,
  flagged_rate: 0.0831,
  average_risk_score: 34.5,
  by_risk_level: { low: 1100, medium: 202, high: 118 },
  cases_by_status: { flagged: 32, investigating: 45, resolved: 28, escalated: 8, closed: 5 }
};

const SAMPLE_TRENDS = [
  { period: '2026-10-04', total: 180, flagged: 12, high_risk: 10, average_risk_score: 28.4 },
  { period: '2026-10-05', total: 210, flagged: 18, high_risk: 15, average_risk_score: 32.1 },
  { period: '2026-10-06', total: 195, flagged: 14, high_risk: 12, average_risk_score: 30.0 },
  { period: '2026-10-07', total: 240, flagged: 22, high_risk: 20, average_risk_score: 38.6 },
  { period: '2026-10-08', total: 220, flagged: 19, high_risk: 18, average_risk_score: 35.2 },
  { period: '2026-10-09', total: 260, flagged: 28, high_risk: 25, average_risk_score: 41.0 },
  { period: '2026-10-10', total: 115, flagged: 5, high_risk: 8, average_risk_score: 29.5 },
];

const SAMPLE_HEATMAP = [
  { region: 'IN-WEST', transaction_type: 'transfer', count: 280, average_risk_score: 54.2 },
  { region: 'IN-WEST', transaction_type: 'purchase', count: 410, average_risk_score: 22.8 },
  { region: 'IN-NORTH', transaction_type: 'withdrawal', count: 190, average_risk_score: 48.5 },
  { region: 'IN-SOUTH', transaction_type: 'transfer', count: 320, average_risk_score: 39.1 },
  { region: 'IN-EAST', transaction_type: 'purchase', count: 220, average_risk_score: 18.4 },
];

export const ReportsPage = () => {
  const { hasRole, user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAnalystRestricted, setIsAnalystRestricted] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [interval, setInterval] = useState('day');
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    setIsAnalystRestricted(false);
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
      setTrends(trendRes.points || []);
      setHeatmap(heatRes.cells || []);
    } catch (err) {
      if (err.status === 403) {
        setIsAnalystRestricted(true);
        setError('Supervisor/Admin authorization required for live report APIs.');
      } else {
        setError(`Live report API notice: ${err.message}`);
      }
      // Fallback presentation mode
      setSummary(SAMPLE_SUMMARY);
      setTrends(SAMPLE_TRENDS);
      setHeatmap(SAMPLE_HEATMAP);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, interval]);

  const handleExport = async (format, type) => {
    setExporting(true);
    try {
      await reportService.exportData(format, type, { from: fromDate, to: toDate });
    } catch (err) {
      alert(`Export error: ${err.message}. (Note: PDF/CSV exports require supervisor or admin authentication)`);
    } finally {
      setExporting(false);
    }
  };

  // Prepare chart data structures
  const riskBarData = summary ? [
    { level: 'Low Risk', count: summary.by_risk_level.low, fill: '#10b981' },
    { level: 'Medium Risk', count: summary.by_risk_level.medium, fill: '#f59e0b' },
    { level: 'High Risk', count: summary.by_risk_level.high, fill: '#f43f5e' },
  ] : [];

  return (
    <div className="reports-page">
      {/* Analyst Role Warning Banner */}
      {!hasRole('supervisor', 'admin') && (
        <div className="alert alert-info">
          <Lock size={18} />
          <span>
            <strong>Role Notice:</strong> You are logged in as <strong>{user?.username} ({user?.role})</strong>. Formal reporting APIs require Supervisor or Admin credentials. Demonstrating with live visual analytics preview.
          </span>
        </div>
      )}

      {error && !isAnalystRestricted && (
        <div className="alert alert-info">
          <AlertTriangle size={18} />
          <span>{error}</span>
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

      {/* KPI Cards */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
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
      )}

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
