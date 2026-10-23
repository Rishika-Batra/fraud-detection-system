import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditService } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { FileText, RefreshCw, AlertTriangle, ShieldCheck, User, Clock, Lock } from 'lucide-react';

export const AuditLogsPage = () => {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditService.getLogs();
      const logList = Array.isArray(res) ? res : (res.data || res.rows || []);
      setLogs(logList);
    } catch (err) {
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setLogs([]);
      let msg = err.message || 'Failed to load audit logs.';
      if (err.status === 403) {
        msg = 'You do not have access to view audit logs';
      } else if (err.status === 404) {
        msg = 'Audit logs not found';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="audit-logs-page">
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs} style={{ marginLeft: 'auto' }}>
            Try again
          </button>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Actor User</th>
                <th>Action Code</th>
                <th>Target Entity</th>
                <th>Action Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw className="spin" size={28} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading audit trail security log...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--risk-high)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>{error}</p>
                    <button className="btn btn-primary btn-sm" onClick={fetchLogs}>
                      Try again
                    </button>
                  </td>
                </tr>
              ) : !Array.isArray(logs) || logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id || Math.random()}>
                    <td className="mono" style={{ fontWeight: 600 }}>#{log.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600 }}>{log.user ? log.user.username : `User #${log.user_id || 'System'}`}</span>
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.15)', borderRadius: '4px', color: '#a5b4fc', fontWeight: 600 }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span>{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '—')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        <Clock size={12} />
                        <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
