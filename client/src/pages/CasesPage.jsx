import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseService } from '../services/caseService';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { formatMoney } from '../utils/formatters';
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  User,
  Clock,
  AlertTriangle,
  Flag,
} from 'lucide-react';

export const CasesPage = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 15,
        status: activeTab || undefined,
        risk_level: riskFilter || undefined
      };
      const res = await caseService.getCases(params);
      const list = res?.data || res?.rows || (Array.isArray(res) ? res : []);
      setCases(list);
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setCases([]);
      let msg = err.message || 'Failed to load cases.';
      if (err.status === 403) {
        msg = 'You do not have access to this case';
      } else if (err.status === 404) {
        msg = 'Case not found';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [activeTab, riskFilter, page]);

  return (
    <div className="cases-page">
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchCases} style={{ marginLeft: 'auto' }}>
            Try again
          </button>
        </div>
      )}

      {/* Header Controls & Status Tabs */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div className="cases-header-row">
          <div className="status-tabs">
            <button
              className={`tab-btn ${activeTab === '' ? 'active' : ''}`}
              onClick={() => { setActiveTab(''); setPage(1); }}
            >
              All Cases
            </button>
            <button
              className={`tab-btn ${activeTab === 'flagged' ? 'active' : ''}`}
              onClick={() => { setActiveTab('flagged'); setPage(1); }}
            >
              Flagged
            </button>
            <button
              className={`tab-btn ${activeTab === 'investigating' ? 'active' : ''}`}
              onClick={() => { setActiveTab('investigating'); setPage(1); }}
            >
              Investigating
            </button>
            <button
              className={`tab-btn ${activeTab === 'escalated' ? 'active' : ''}`}
              onClick={() => { setActiveTab('escalated'); setPage(1); }}
            >
              Escalated
            </button>
            <button
              className={`tab-btn ${activeTab === 'resolved' ? 'active' : ''}`}
              onClick={() => { setActiveTab('resolved'); setPage(1); }}
            >
              Resolved
            </button>
            <button
              className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`}
              onClick={() => { setActiveTab('closed'); setPage(1); }}
            >
              Closed
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="select"
              style={{ width: '160px' }}
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>

            <button className="btn btn-secondary" onClick={fetchCases} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Case Desk Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Linked Tx ID</th>
                <th>Transaction Amount</th>
                <th>Risk Profile</th>
                <th>Assigned To</th>
                <th>Created Timestamp</th>
                <th>Workflow Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw className="spin" size={28} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading active case files...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--risk-high)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>{error}</p>
                    <button className="btn btn-primary btn-sm" onClick={fetchCases}>
                      Try again
                    </button>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Briefcase size={32} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>No active investigation cases match this filter.</p>
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      CASE-#{c.id}
                    </td>
                    <td className="mono">
                      #{c.transaction_id}
                    </td>
                    <td>
                      {c.transaction ? (
                        <span style={{ fontWeight: 700 }}>
                          {formatMoney(c.transaction.amount, c.transaction.currency)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {c.transaction ? (
                        <RiskBadge level={c.transaction.risk_level} score={c.transaction.risk_score} />
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{c.assignee ? c.assignee.username : <span style={{ color: 'var(--text-dim)', italic: true }}>Unassigned</span>}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Clock size={13} />
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        <ExternalLink size={14} />
                        <span>Investigate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .cases-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .status-tabs {
          display: flex;
          gap: 0.4rem;
          background: rgba(15, 23, 42, 0.6);
          padding: 0.35rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          overflow-x: auto;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 0.5rem 0.9rem;
          font-family: var(--font-sans);
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-muted);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: #fff;
        }

        .tab-btn.active {
          background: var(--primary);
          color: #fff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
};
