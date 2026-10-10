import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setLoading(true);
    setError(null);
    try {
      await login(demoUser, demoPass);
      navigate('/dashboard');
    } catch (err) {
      setError(`Login notice: ${err.message}. If user doesn't exist yet in DB, admin can create it.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="brand-badge">
            <Shield size={36} className="brand-logo-icon" />
          </div>
          <h1>SentinelGuard</h1>
          <p className="login-subtitle">Enterprise Fraud Detection & Risk Management Desk</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="quick-demo-section">
          <div className="demo-divider">
            <span>Quick Demo Credentials</span>
          </div>

          <div className="demo-buttons-grid">
            <button
              className="demo-role-btn role-analyst"
              onClick={() => handleQuickLogin('analyst', 'password123')}
            >
              <div className="role-btn-title">Analyst Account</div>
              <div className="role-btn-sub">View & flag transactions</div>
            </button>

            <button
              className="demo-role-btn role-supervisor"
              onClick={() => handleQuickLogin('supervisor', 'password123')}
            >
              <div className="role-btn-title">Supervisor Account</div>
              <div className="role-btn-sub">Escalations & reports</div>
            </button>

            <button
              className="demo-role-btn role-admin"
              onClick={() => handleQuickLogin('admin', 'admin123')}
            >
              <div className="role-btn-title">Admin Account</div>
              <div className="role-btn-sub">Full audit & user mgmt</div>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem 2rem;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .brand-badge {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 1rem auto;
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        }

        .login-header h1 {
          font-size: 1.75rem;
          margin-bottom: 0.35rem;
        }

        .login-subtitle {
          font-size: 0.825rem;
          color: var(--text-muted);
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-dim);
        }

        .input-with-icon .input {
          padding-left: 2.75rem;
        }

        .btn-login {
          width: 100%;
          margin-top: 1rem;
          padding: 0.8rem;
          font-size: 0.95rem;
        }

        .quick-demo-section {
          margin-top: 2rem;
        }

        .demo-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-dim);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        .demo-divider::before, .demo-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }

        .demo-divider span {
          padding: 0 0.75rem;
        }

        .demo-buttons-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.6rem;
        }

        .demo-role-btn {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.65rem 1rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .demo-role-btn:hover {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.1);
        }

        .role-btn-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-main);
        }

        .role-btn-sub {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
      `}</style>
    </div>
  );
};
