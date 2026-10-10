import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionService } from '../services/transactionService';
import { RiskBadge } from '../components/ui/RiskBadge';
import { StatCard } from '../components/ui/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  RefreshCw,
  Flag,
  Eye,
  Activity,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  X,
  PlusCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

const SAMPLE_TRANSACTIONS = [
  { id: 101, account_id: 'ACC-88392', amount: 48500.00, currency: 'INR', merchant: 'CryptoX Exchange', transaction_type: 'transfer', region: 'IN-WEST', timestamp: new Date(Date.now() - 3600000).toISOString(), risk_score: 88, risk_level: 'high', risk_factors: ['High amount for account profile', 'Unusual region location', 'High velocity transfer'], is_flagged: true },
  { id: 102, account_id: 'ACC-44910', amount: 1240.50, currency: 'INR', merchant: 'TechGear Store', transaction_type: 'purchase', region: 'IN-NORTH', timestamp: new Date(Date.now() - 7200000).toISOString(), risk_score: 22, risk_level: 'low', risk_factors: [], is_flagged: false },
  { id: 103, account_id: 'ACC-91204', amount: 19800.00, currency: 'INR', merchant: 'Global Pay Wire', transaction_type: 'withdrawal', region: 'IN-SOUTH', timestamp: new Date(Date.now() - 10800000).toISOString(), risk_score: 65, risk_level: 'medium', risk_factors: ['Multiple rapid withdrawals'], is_flagged: false },
  { id: 104, account_id: 'ACC-12093', amount: 75200.00, currency: 'INR', merchant: 'Luxury Watches Ltd', transaction_type: 'purchase', region: 'IN-WEST', timestamp: new Date(Date.now() - 14400000).toISOString(), risk_score: 92, risk_level: 'high', risk_factors: ['High amount purchase', 'First time merchant'], is_flagged: true },
  { id: 105, account_id: 'ACC-67482', amount: 350.00, currency: 'INR', merchant: 'FreshMart Superstore', transaction_type: 'purchase', region: 'IN-EAST', timestamp: new Date(Date.now() - 18000000).toISOString(), risk_score: 12, risk_level: 'low', risk_factors: [], is_flagged: false },
];

export const DashboardPage = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingSampleData, setUsingSampleData] = useState(false);

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState('');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [flagging, setFlagging] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Quick Ingest Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestForm, setIngestForm] = useState({
    account_id: 'ACC-' + Math.floor(10000 + Math.random() * 90000),
    amount: '15000',
    currency: 'INR',
    merchant: 'Online Casino',
    transaction_type: 'transfer',
    region: 'IN-WEST'
  });

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 15,
        sort_by: sortBy,
        order: sortOrder,
        risk_level: riskLevel || undefined,
        region: regionFilter || undefined,
        transaction_type: typeFilter || undefined,
        is_flagged: flaggedFilter !== '' ? flaggedFilter === 'true' : undefined,
        account_id: searchQuery ? searchQuery.trim() : undefined,
      };

      const res = await transactionService.getTransactions(params);
      setTransactions(res.rows || []);
      setTotalCount(res.count || (res.rows ? res.rows.length : 0));
      setUsingSampleData(false);
    } catch (err) {
      console.warn('API error, switching to fallback sample feed:', err.message);
      let filtered = [...SAMPLE_TRANSACTIONS];
      if (riskLevel) filtered = filtered.filter(t => t.risk_level === riskLevel);
      if (regionFilter) filtered = filtered.filter(t => t.region === regionFilter);
      if (typeFilter) filtered = filtered.filter(t => t.transaction_type === typeFilter);
      if (flaggedFilter !== '') filtered = filtered.filter(t => t.is_flagged === (flaggedFilter === 'true'));
      if (searchQuery) filtered = filtered.filter(t => t.account_id.toLowerCase().includes(searchQuery.toLowerCase()));

      setTransactions(filtered);
      setTotalCount(filtered.length);
      setUsingSampleData(true);
      setError(`Backend connected with sample mode (${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, riskLevel, regionFilter, typeFilter, flaggedFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleFlagTransaction = async (txId) => {
    setFlagging(true);
    setActionMessage(null);
    try {
      const newCase = await transactionService.flagTransaction(txId);
      setActionMessage({ type: 'success', text: `Transaction #${txId} flagged! Case #${newCase.id} created.` });
      // Update local state
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, is_flagged: true } : t));
      if (selectedTx && selectedTx.id === txId) {
        setSelectedTx(prev => ({ ...prev, is_flagged: true }));
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to flag transaction' });
    } finally {
      setFlagging(false);
    }
  };

  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    try {
      await transactionService.ingestTransactions({
        ...ingestForm,
        amount: parseFloat(ingestForm.amount)
      });
      setShowIngestModal(false);
      setActionMessage({ type: 'success', text: 'Simulated transaction ingested and scored successfully!' });
      fetchTransactions();
    } catch (err) {
      alert('Ingest error: ' + err.message);
    }
  };

  // Calculate summary metrics
  const totalAmountSum = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const flaggedCount = transactions.filter(t => t.is_flagged).length;
  const highRiskCount = transactions.filter(t => t.risk_level === 'high').length;
  const avgRiskScore = transactions.length ? Math.round(transactions.reduce((acc, t) => acc + (t.risk_score || 0), 0) / transactions.length) : 0;

  return (
    <div className="dashboard-page">
      {/* Sample mode alert banner */}
      {usingSampleData && (
        <div className="alert alert-info">
          <AlertTriangle size={18} />
          <span>
            <strong>Simulated Data Active:</strong> Backend service unreachable. Presenting structured fallback transaction feed.
          </span>
        </div>
      )}

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type}`}>
          {actionMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{actionMessage.text}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setActionMessage(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Monitored Transactions"
          value={totalCount.toLocaleString()}
          subtext={`Vol: ₹${totalAmountSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="High Risk Signals"
          value={highRiskCount}
          subtext={`${((highRiskCount / (transactions.length || 1)) * 100).toFixed(1)}% of total volume`}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Flagged for Investigation"
          value={flaggedCount}
          subtext="FR-09 Active Case Pipeline"
          icon={Flag}
          color="amber"
        />
        <StatCard
          title="Average Risk Score"
          value={`${avgRiskScore} / 100`}
          subtext={avgRiskScore > 50 ? 'Elevated threat level' : 'Normal risk profile'}
          icon={TrendingUp}
          color={avgRiskScore > 50 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Controls & Search Bar */}
      <div className="glass-card controls-card" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="controls-top">
          <form onSubmit={handleSearchSubmit} className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="input search-input"
              placeholder="Search by Account ID (e.g. ACC-88392)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={fetchTransactions} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            {hasRole('analyst', 'supervisor', 'admin') && (
              <button className="btn btn-primary" onClick={() => setShowIngestModal(true)}>
                <PlusCircle size={16} />
                <span>Simulate Ingest</span>
              </button>
            )}
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-item">
            <label className="form-label">Risk Level</label>
            <select className="select" value={riskLevel} onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}>
              <option value="">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="form-label">Flag Status</label>
            <select className="select" value={flaggedFilter} onChange={(e) => { setFlaggedFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="true">Flagged Only</option>
              <option value="false">Unflagged Only</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="form-label">Type</label>
            <select className="select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="transfer">Transfer</option>
              <option value="purchase">Purchase</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="form-label">Region</label>
            <select className="select" value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}>
              <option value="">All Regions</option>
              <option value="IN-NORTH">IN-NORTH</option>
              <option value="IN-SOUTH">IN-SOUTH</option>
              <option value="IN-EAST">IN-EAST</option>
              <option value="IN-WEST">IN-WEST</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="form-label">Sort By</label>
            <select className="select" value={`${sortBy}:${sortOrder}`} onChange={(e) => {
              const [sb, so] = e.target.value.split(':');
              setSortBy(sb);
              setSortOrder(so);
            }}>
              <option value="risk_score:DESC">Risk Score (High → Low)</option>
              <option value="risk_score:ASC">Risk Score (Low → High)</option>
              <option value="amount:DESC">Amount (Highest First)</option>
              <option value="timestamp:DESC">Timestamp (Latest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Account Identifier</th>
                <th>Amount & Currency</th>
                <th>Merchant</th>
                <th>Type / Region</th>
                <th>Risk Indicator</th>
                <th>Case Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw className="spin" size={28} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading real-time transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>No transactions found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      #{tx.id}
                    </td>
                    <td>
                      <span className="mono" style={{ fontWeight: 600 }}>{tx.account_id}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                        {tx.currency}
                      </span>
                    </td>
                    <td>{tx.merchant || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{tx.transaction_type}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tx.region || 'Global'}</div>
                    </td>
                    <td>
                      <RiskBadge level={tx.risk_level} score={tx.risk_score} />
                    </td>
                    <td>
                      {tx.is_flagged ? (
                        <span className="badge badge-status-flagged">
                          <Flag size={12} /> Flagged
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Normal</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedTx(tx)}
                          title="View Details"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>

                        {hasRole('analyst', 'supervisor') && !tx.is_flagged && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleFlagTransaction(tx.id)}
                            disabled={flagging}
                            title="Flag for Investigation (FR-09)"
                          >
                            <Flag size={14} />
                            <span>Flag</span>
                          </button>
                        )}

                        {tx.is_flagged && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate('/cases')}
                            title="Go to Case Desk"
                          >
                            <ExternalLink size={14} />
                            <span>Case</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity style={{ color: 'var(--primary)' }} />
                <h3>Transaction #{selectedTx.id} Details</h3>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setSelectedTx(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Account Identifier</label>
                  <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedTx.account_id}</div>
                </div>
                <div>
                  <label className="form-label">Amount & Currency</label>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{Number(selectedTx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {selectedTx.currency}
                  </div>
                </div>
                <div>
                  <label className="form-label">Merchant</label>
                  <div>{selectedTx.merchant || 'Unknown Merchant'}</div>
                </div>
                <div>
                  <label className="form-label">Timestamp</label>
                  <div className="mono" style={{ fontSize: '0.85rem' }}>{new Date(selectedTx.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-color)' }} />

              <div>
                <label className="form-label" style={{ marginBottom: '0.5rem' }}>Risk Score Evaluation (Rule-Engine)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <RiskBadge level={selectedTx.risk_level} score={selectedTx.risk_score} />
                  <div style={{ flex: 1, background: '#1e293b', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(selectedTx.risk_score || 0, 100)}%`,
                        height: '100%',
                        background: selectedTx.risk_score >= 80 ? 'var(--risk-high)' : selectedTx.risk_score >= 50 ? 'var(--risk-medium)' : 'var(--risk-low)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Triggered Risk Factors</h4>
                {selectedTx.risk_factors && selectedTx.risk_factors.length > 0 ? (
                  <ul style={{ paddingLeft: '1.2rem', color: 'var(--risk-high)', fontSize: '0.875rem' }}>
                    {selectedTx.risk_factors.map((rf, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{rf}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No anomaly indicators triggered for this transaction.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTx(null)}>Close</button>
              {hasRole('analyst', 'supervisor') && !selectedTx.is_flagged && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleFlagTransaction(selectedTx.id)}
                  disabled={flagging}
                >
                  <Flag size={16} />
                  <span>Flag for FR-09 Case Investigation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simulate Ingest Modal */}
      {showIngestModal && (
        <div className="modal-overlay" onClick={() => setShowIngestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Simulate Upstream Transaction Ingest</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowIngestModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIngestSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Account ID</label>
                  <input
                    type="text"
                    className="input"
                    value={ingestForm.account_id}
                    onChange={(e) => setIngestForm({ ...ingestForm, account_id: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input
                    type="number"
                    className="input"
                    value={ingestForm.amount}
                    onChange={(e) => setIngestForm({ ...ingestForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Merchant Name</label>
                  <input
                    type="text"
                    className="input"
                    value={ingestForm.merchant}
                    onChange={(e) => setIngestForm({ ...ingestForm, merchant: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="select"
                      value={ingestForm.transaction_type}
                      onChange={(e) => setIngestForm({ ...ingestForm, transaction_type: e.target.value })}
                    >
                      <option value="transfer">Transfer</option>
                      <option value="purchase">Purchase</option>
                      <option value="withdrawal">Withdrawal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <select
                      className="select"
                      value={ingestForm.region}
                      onChange={(e) => setIngestForm({ ...ingestForm, region: e.target.value })}
                    >
                      <option value="IN-WEST">IN-WEST</option>
                      <option value="IN-NORTH">IN-NORTH</option>
                      <option value="IN-SOUTH">IN-SOUTH</option>
                      <option value="IN-EAST">IN-EAST</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIngestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Ingest & Run Scoring Engine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
        }

        .controls-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
        }

        .search-input {
          padding-left: 2.75rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .filters-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
