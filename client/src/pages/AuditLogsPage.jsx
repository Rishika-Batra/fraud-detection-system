import React, { useState, useEffect } from 'react';
import { auditService } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { FileText, RefreshCw, AlertTriangle, ShieldCheck, User, Clock, Lock } from 'lucide-react';

const SAMPLE_LOGS = [
  { id: 1, user_id: 1, action: 'LOGIN_SUCCESS', entity_type: 'User', entity_id: 1, details: { username: 'analyst' }, timestamp: new Date(Date.now() - 120000).toISOString(), user: { username: 'analyst' } },
  { id: 2, user_id: 1, action: 'CASE_STATUS_UPDATED', entity_type: 'Case', entity_id: 2, details: { from: 'flagged', to: 'investigating' }, timestamp: new Date(Date.now() - 3600000).toISOString(), user: { username: 'analyst' } },
  { id: 3, user_id: 2, action: 'REPORT_EXPORTED', entity_type: 'Report', entity_id: null, details: { type: 'cases', format: 'pdf' }, timestamp: new Date(Date.now() - 7200000).toISOString(), user: { username: 'supervisor' } },
];

export const AuditLogsPage = () => {
  const { hasRole, user } = useAuth();
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
      console.warn('Audit logs API notice:', err);
      setLogs(SAMPLE_LOGS);
      if (err.status === 403) {
        setError(`Role Notice: Viewing audit logs requires Supervisor or Admin role. Currently logged in as ${user?.username} (${user?.role}).`);
      } else {
        setError(`Audit trail notice: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="audit-logs-page">
      {!hasRole('supervisor', 'admin') && (
        <div className="alert alert-info">
          <Lock size={18} />
          <span>
            <strong>Role Notice:</strong> Live Audit Logs endpoint requires Supervisor or Admin authorization. Presenting audit security preview.
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-info">
          <AlertTriangle size={18} />
          <span>{error}</span>
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
