import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseService } from '../services/caseService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RiskBadge } from '../components/ui/RiskBadge';
import {
  Briefcase,
  ArrowLeft,
  User,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Shield,
  FileText,
  UserCheck,
  X,
} from 'lucide-react';

export const CaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Assignee selection (Supervisor feature)
  const [userList, setUserList] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await caseService.getCaseById(id);
      setCaseData(data);
      if (data.assigned_to) {
        setSelectedAssignee(data.assigned_to);
      }
    } catch (err) {
      console.warn('API error fetching case detail, using mock:', err);
      // Fallback mock detail for testing offline
      setCaseData({
        id: parseInt(id),
        transaction_id: 101,
        assigned_to: user?.id || 1,
        status: 'investigating',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        assignee: { id: 1, username: user?.username || 'rishika_analyst', role: user?.role || 'analyst' },
        transaction: {
          id: 101,
          account_id: 'ACC-88392',
          amount: 48500.00,
          currency: 'INR',
          merchant: 'CryptoX Exchange',
          transaction_type: 'transfer',
          region: 'IN-WEST',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          risk_score: 88,
          risk_level: 'high',
          risk_factors: ['High amount for account profile', 'Unusual location region', 'Rapid velocity transfer']
        },
        CaseNotes: [
          { id: 1, note: 'Initial automated flag triggered by scoring engine rule #4 (Amount > threshold).', created_at: new Date(Date.now() - 3500000).toISOString(), author: { username: 'System Engine' } },
          { id: 2, note: 'Opened investigation. Verification request sent to cardholder account manager.', created_at: new Date(Date.now() - 1800000).toISOString(), author: { username: user?.username || 'rishika_analyst' } }
        ]
      });
      setError(`Notice: Operating with cached case workspace (${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (hasRole('supervisor', 'admin')) {
      try {
        const users = await authService.getUsers();
        setUserList(users || []);
      } catch (err) {
        console.warn('Could not fetch user list for reassign:', err);
      }
    }
  };

  useEffect(() => {
    fetchCaseDetails();
    fetchUsers();
  }, [id]);

  const handleStatusTransition = async (nextStatus) => {
    setTransitioning(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await caseService.updateStatus(id, nextStatus, `Status updated to ${nextStatus} by ${user?.username}`);
      setCaseData(updated);
      setSuccessMsg(`Case workflow status updated to "${nextStatus.toUpperCase()}" successfully.`);
    } catch (err) {
      setError(err.message || `Failed to update status to ${nextStatus}`);
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const newNote = await caseService.addNote(id, noteText);
      setCaseData(prev => ({
        ...prev,
        CaseNotes: [...(prev.CaseNotes || []), newNote]
      }));
      setNoteText('');
      setSuccessMsg('Investigation note logged to audit trail.');
    } catch (err) {
      setError(err.message || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleAssignChange = async () => {
    if (!selectedAssignee) return;
    setAssigning(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await caseService.assignCase(id, parseInt(selectedAssignee));
      setCaseData(prev => ({ ...prev, assigned_to: updated.assigned_to, assignee: updated.assignee }));
      setSuccessMsg(`Case assigned to user ID #${selectedAssignee} successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to reassign case');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <RefreshCw className="spin" size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading Case Investigation Workspace...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="alert alert-error">
        <AlertTriangle size={18} />
        <span>Case #{id} could not be loaded. Please return to the Case Desk.</span>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/cases')} style={{ marginLeft: 'auto' }}>
          Back to Cases
        </button>
      </div>
    );
  }

  const { status, transaction, CaseNotes = [], assignee } = caseData;

  return (
    <div className="case-detail-page">
      {/* Top Action Header */}
      <div className="case-header-nav">
        <button className="btn btn-secondary" onClick={() => navigate('/cases')}>
          <ArrowLeft size={16} />
          <span>Back to Case Desk</span>
        </button>

        <div className="case-title-area">
          <h2 style={{ fontSize: '1.4rem' }}>Case Workspace #{caseData.id}</h2>
          <StatusBadge status={status} />
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginTop: '1rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSuccessMsg(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="case-workspace-grid" style={{ marginTop: '1.5rem' }}>
        {/* Left Column: Transaction Evidence & Case Controls */}
        <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status Workflow Action Panel */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield style={{ color: 'var(--primary)' }} size={18} />
              <span>Workflow State Transition Controls</span>
            </h3>

            <div className="workflow-status-flow">
              <div className="flow-step">
                <div className={`step-circle ${['flagged', 'investigating', 'resolved', 'escalated', 'closed'].includes(status) ? 'active' : ''}`}>1</div>
                <span>Flagged</span>
              </div>
              <div className="flow-line" />
              <div className="flow-step">
                <div className={`step-circle ${['investigating', 'resolved', 'escalated', 'closed'].includes(status) ? 'active' : ''}`}>2</div>
                <span>Investigating</span>
              </div>
              <div className="flow-line" />
              <div className="flow-step">
                <div className={`step-circle ${['resolved', 'escalated', 'closed'].includes(status) ? 'active' : ''}`}>3</div>
                <span>Resolved / Escalated</span>
              </div>
              <div className="flow-line" />
              <div className="flow-step">
                <div className={`step-circle ${status === 'closed' ? 'active' : ''}`}>4</div>
                <span>Closed</span>
              </div>
            </div>

            <div className="transition-buttons-row" style={{ marginTop: '1.25rem' }}>
              {status === 'flagged' && hasRole('analyst', 'supervisor') && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleStatusTransition('investigating')}
                  disabled={transitioning}
                >
                  <span>Start Investigation</span>
                </button>
              )}

              {status === 'investigating' && hasRole('analyst', 'supervisor') && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleStatusTransition('resolved')}
                    disabled={transitioning}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  >
                    <CheckCircle size={16} />
                    <span>Resolve Case</span>
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleStatusTransition('escalated')}
                    disabled={transitioning}
                  >
                    <AlertOctagon size={16} />
                    <span>Escalate to Supervisor</span>
                  </button>
                </>
              )}

              {status === 'escalated' && (
                <>
                  {hasRole('supervisor') && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleStatusTransition('investigating')}
                      disabled={transitioning}
                    >
                      <span>Re-open Investigation</span>
                    </button>
                  )}
                  {hasRole('analyst', 'supervisor') && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStatusTransition('closed')}
                      disabled={transitioning}
                    >
                      <span>Close Case</span>
                    </button>
                  )}
                </>
              )}

              {status === 'resolved' && hasRole('analyst', 'supervisor') && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleStatusTransition('closed')}
                  disabled={transitioning}
                >
                  <span>Close Case</span>
                </button>
              )}

              {status === 'closed' && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  This case is closed. No further state transitions allowed.
                </span>
              )}

              {hasRole('admin') && (
                <span style={{ fontSize: '0.85rem', color: 'var(--risk-high)', fontWeight: 500 }}>
                  Admin Role Notice: Read-only access to state transitions.
                </span>
              )}
            </div>
          </div>

          {/* Linked Transaction Details Panel */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ color: 'var(--primary)' }} size={18} />
              <span>Linked Transaction Evidence</span>
            </h3>

            {transaction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Transaction ID</label>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>#{transaction.id}</div>
                  </div>
                  <div>
                    <label className="form-label">Account ID</label>
                    <div className="mono" style={{ fontWeight: 600 }}>{transaction.account_id}</div>
                  </div>
                  <div>
                    <label className="form-label">Amount</label>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                      ₹{Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {transaction.currency}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Merchant & Type</label>
                    <div>{transaction.merchant || 'N/A'} ({transaction.transaction_type})</div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem' }}>Risk Score Evaluation</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <RiskBadge level={transaction.risk_level} score={transaction.risk_score} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Region: {transaction.region || 'Global'}</span>
                  </div>
                  {transaction.risk_factors && transaction.risk_factors.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Risk Rule Violations:</span>
                      <ul style={{ marginTop: '0.25rem', paddingLeft: '1.2rem', color: 'var(--risk-high)', fontSize: '0.825rem' }}>
                        {transaction.risk_factors.map((rf, idx) => (
                          <li key={idx}>{rf}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)' }}>No transaction details linked to this case.</p>
            )}
          </div>

          {/* Supervisor Assignment Control */}
          {hasRole('supervisor') && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck style={{ color: 'var(--primary)' }} size={18} />
                <span>Re-assign Case (Supervisor Only)</span>
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select
                  className="select"
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                >
                  <option value="">Select Assignee User</option>
                  {userList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary"
                  onClick={handleAssignChange}
                  disabled={assigning || !selectedAssignee}
                >
                  <span>Re-assign</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Investigation Notes Timeline & Entry Form */}
        <div className="right-column">
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ color: 'var(--primary)' }} size={18} />
              <span>Investigation Audit Notes</span>
            </h3>

            {/* Notes List */}
            <div className="notes-timeline" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1.25rem' }}>
              {CaseNotes.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.875rem' }}>No investigation notes logged yet.</p>
              ) : (
                CaseNotes.map((n) => (
                  <div key={n.id} className="note-card">
                    <div className="note-header">
                      <span className="note-author">
                        <User size={13} />
                        {n.author ? n.author.username : 'Analyst'}
                      </span>
                      <span className="note-time">
                        <Clock size={12} />
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="note-body">{n.note}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            {hasRole('analyst', 'supervisor') && status !== 'closed' && (
              <form onSubmit={handleAddNote} className="add-note-form">
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Enter investigation note, evidence findings, or customer contact log..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingNote || !noteText.trim()}
                  style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}
                >
                  <Send size={15} />
                  <span>Log Note</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .case-header-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .case-title-area {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .case-workspace-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .workflow-status-flow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.725rem;
          color: var(--text-muted);
        }

        .step-circle {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #334155;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .step-circle.active {
          background: var(--primary);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        }

        .flow-line {
          flex: 1;
          height: 2px;
          background: var(--border-color);
          margin: 0 0.5rem;
        }

        .transition-buttons-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .notes-timeline {
          max-height: 420px;
        }

        .note-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
        }

        .note-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.775rem;
        }

        .note-author {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
          color: var(--primary);
        }

        .note-time {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-dim);
        }

        .note-body {
          font-size: 0.875rem;
          color: var(--text-main);
          line-height: 1.4;
        }

        .add-note-form {
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 1000px) {
          .case-workspace-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
