import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caseService } from '../services/caseService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { formatMoney } from '../utils/formatters';
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
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setCaseData(null);
      let msg = err.message || 'Failed to load case details.';
      if (err.status === 404) {
        msg = 'Case not found';
      } else if (err.status === 403) {
        msg = 'You do not have access to this case';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (hasRole('supervisor', 'admin')) {
      try {
        const users = await authService.getUsers();
        setUserList(Array.isArray(users) ? users : (users?.data || users?.rows || []));
      } catch (err) {
        if (err.status === 401) {
          navigate('/login');
          return;
        }
        console.warn('Could not fetch user list for reassign:', err);
        setError(err.message || 'Failed to load user list for reassignment');
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
      await caseService.updateStatus(id, nextStatus, `Status updated to ${nextStatus} by ${user?.username}`);
      setSuccessMsg(`Case workflow status updated to "${nextStatus.toUpperCase()}" successfully.`);
      await fetchCaseDetails();
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
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
      await caseService.addNote(id, noteText);
      setNoteText('');
      setSuccessMsg('Investigation note logged to audit trail.');
      await fetchCaseDetails();
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
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
      await caseService.assignCase(id, parseInt(selectedAssignee));
      setSuccessMsg(`Case assigned to user ID #${selectedAssignee} successfully.`);
      await fetchCaseDetails();
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
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
      <div style={{ padding: '2rem' }}>
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <AlertTriangle size={18} />
          <span>{error || `Case #${id} could not be loaded.`}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={fetchCaseDetails}>
              Try again
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/cases')}>
              Back to Cases
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { status, transaction, assignee } = caseData;
  const CaseNotes = caseData.CaseNotes || caseData.notes || [];

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
                    <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-bright)' }}>
                      {formatMoney(transaction.amount, transaction.currency)}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Merchant & Type</label>
                    <div>{transaction.merchant || 'N/A'} ({transaction.transaction_type})</div>
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <label className="form-label" style={{ marginBottom: '0.4rem' }}>Risk Score Evaluation</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <RiskBadge level={transaction.risk_level} score={transaction.risk_score} />
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Region: {transaction.region || 'Global'}</span>
                  </div>
                  {transaction.risk_factors && transaction.risk_factors.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase' }}>Risk Rule Violations:</span>
                      <ul style={{ marginTop: '0.25rem', paddingLeft: '1.2rem', color: 'var(--danger-text)', fontSize: '0.825rem' }}>
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
          padding: 0.85rem;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.725rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .step-circle {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .step-circle.active {
          background: linear-gradient(135deg, #D8B45A 0%, #B58A2E 100%);
          color: #1A1408;
          border-color: var(--gold);
          box-shadow: 0 0 10px rgba(201, 162, 75, 0.4);
        }

        .flow-line {
          flex: 1;
          height: 2px;
          background: var(--border);
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
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
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
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--gold-light);
        }

        .note-time {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .note-body {
          font-size: 0.875rem;
          color: var(--text);
          line-height: 1.5;
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
