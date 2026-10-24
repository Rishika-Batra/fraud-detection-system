import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

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
    <div className="login-page-container">
      {/* Left Panel: Emerald Radial Gradient & Gold Concentric Geometry */}
      <div className="login-left-panel">
        {/* Large Concentric Circles & Crosslines SVG bleeding off bottom-right */}
        <svg
          className="radar-lines-svg"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="300" cy="300" r="50" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.45" />
          <circle cx="300" cy="300" r="110" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="300" cy="300" r="180" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.32" />
          <circle cx="300" cy="300" r="250" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="300" cy="300" r="320" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.18" />
          <circle cx="300" cy="300" r="390" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.12" />
          <line x1="300" y1="0" x2="300" y2="600" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.35" />
          <line x1="0" y1="300" x2="600" y2="300" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.35" />
          <line x1="88" y1="88" x2="512" y2="512" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.22" />
          <line x1="88" y1="512" x2="512" y2="88" stroke="#C9A24B" strokeWidth="1" strokeOpacity="0.22" />
        </svg>

        {/* Top Brand Logo & Wordmark */}
        <div className="login-brand-header">
          <svg
            className="brand-shield-svg"
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="brand-wordmark">SENTINELGUARD</span>
        </div>

        {/* Hero Statement */}
        <div className="login-hero-content">
          <div className="login-eyebrow">FRAUD DETECTION MANAGEMENT</div>
          <h1 className="login-hero-title">Every deception leaves a trace.</h1>
          <p className="login-hero-subtitle">
            Score transactions, open cases and keep a tamper-proof audit trail, all in one place.
          </p>
        </div>

        {/* Bottom-left pinned mono tags with thin gold line above them */}
        <div className="login-bottom-tags-container">
          <div className="login-tags-line" />
          <div className="login-feature-tags">
            <span>RBAC</span>
            <span className="tag-bullet">•</span>
            <span>AUDIT TRAIL</span>
            <span className="tag-bullet">•</span>
            <span>CSV INGESTION</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Full-height Sign In Form */}
      <div className="login-right-panel">
        <div className="login-panel-inner">
          <div className="signin-header">
            <h2 className="signin-title">Sign In</h2>
            <p className="signin-subtitle">Use your analyst, supervisor or admin account.</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                USERNAME
              </label>
              <input
                id="login-username"
                type="text"
                className="input login-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                PASSWORD
              </label>
              <input
                id="login-password"
                type="password"
                className="input login-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-signin-submit"
              aria-label="Sign In to Dashboard"
              disabled={loading}
            >
              <span>{loading ? 'AUTHENTICATING...' : 'SIGN IN'}</span>
            </button>
          </form>

          {import.meta.env.VITE_SHOW_DEMO_LOGIN === 'true' && (
            <div className="quick-demo-section">
              <div className="demo-divider">
                <span>Quick demo</span>
              </div>

              <div className="demo-pills-row">
                <button
                  type="button"
                  className="demo-pill-btn"
                  title="analyst1 / password123"
                  onClick={() => handleQuickLogin('analyst1', 'password123')}
                >
                  Analyst
                </button>

                <button
                  type="button"
                  className="demo-pill-btn"
                  title="supervisor1 / password123"
                  onClick={() => handleQuickLogin('supervisor1', 'password123')}
                >
                  Supervisor
                </button>

                <button
                  type="button"
                  className="demo-pill-btn"
                  title="admin / password123"
                  onClick={() => handleQuickLogin('admin', 'password123')}
                >
                  Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .login-page-container {
          min-height: 100vh;
          width: 100vw;
          background-color: var(--bg);
          display: flex;
          margin: 0;
          padding: 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* ─── Left Panel: 60% Width, Radial Emerald Gradient ─── */
        .login-left-panel {
          flex: 1 1 60%;
          width: 60%;
          min-height: 100vh;
          background: radial-gradient(circle at 25% 25%, #0F3D2C 0%, #0A2A1F 45%, #070B09 100%);
          position: relative;
          overflow: hidden;
          padding: 72px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid var(--border);
          box-sizing: border-box;
        }

        @keyframes rotateRadar {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }

        .radar-lines-svg {
          position: absolute;
          right: -160px;
          bottom: -160px;
          width: 820px;
          height: 820px;
          opacity: 0.35;
          pointer-events: none;
          transform-origin: center center;
          animation: rotateRadar 60s linear infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .radar-lines-svg {
            animation: none;
          }
        }

        .login-brand-header {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          z-index: 2;
        }

        .brand-shield-svg {
          flex-shrink: 0;
        }

        .brand-wordmark {
          font-family: var(--font-serif);
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: var(--gold-light);
        }

        .login-hero-content {
          max-width: 680px;
          z-index: 2;
          margin: 2.5rem 0;
        }

        .login-eyebrow {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .login-hero-title {
          font-family: var(--font-serif);
          font-size: 60px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-bright);
          letter-spacing: 0.01em;
          margin-bottom: 1.25rem;
        }

        .login-hero-subtitle {
          font-size: 18px;
          color: var(--text-soft);
          line-height: 1.6;
          max-width: 580px;
        }

        .login-bottom-tags-container {
          z-index: 2;
        }

        .login-tags-line {
          height: 1px;
          width: 100%;
          max-width: 380px;
          background: var(--gold-border);
          margin-bottom: 1.25rem;
          opacity: 0.7;
        }

        .login-feature-tags {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-muted);
          letter-spacing: 0.16em;
        }

        .tag-bullet {
          color: var(--gold-border);
        }

        /* ─── Right Panel: 40% Width (min 440px), Form Vertically Centred ─── */
        .login-right-panel {
          flex: 0 0 40%;
          width: 40%;
          min-width: 440px;
          min-height: 100vh;
          background-color: var(--bg-panel);
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
        }

        .login-panel-inner {
          width: 100%;
          max-width: 400px;
        }

        .signin-header {
          margin-bottom: 2rem;
        }

        .signin-title {
          font-family: var(--font-serif);
          font-size: 34px;
          font-weight: 700;
          color: var(--text-bright);
          letter-spacing: 0.02em;
          margin-bottom: 0.4rem;
        }

        .signin-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .login-input {
          height: 52px;
          border-radius: 6px;
          border: 1px solid var(--border-input);
          background-color: var(--surface-2);
          color: var(--text);
          padding: 0 1.15rem;
          font-size: 0.95rem;
          font-family: var(--font-sans);
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .login-input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 12px rgba(201, 162, 75, 0.25), 0 0 0 1px var(--gold);
          outline: none;
        }

        .btn-signin-submit {
          height: 50px;
          width: 100%;
          margin-top: 1.5rem;
          background: linear-gradient(135deg, #D8B45A 0%, #B58A2E 100%);
          color: #1A1408;
          font-family: var(--font-sans);
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border-radius: 6px;
          border: 1px solid var(--gold);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(201, 162, 75, 0.28);
        }

        .btn-signin-submit:hover {
          background: linear-gradient(135deg, #E3C777 0%, #C9A24B 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(201, 162, 75, 0.42);
        }

        .btn-signin-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .quick-demo-section {
          margin-top: 2rem;
        }

        .demo-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 1rem;
        }

        .demo-divider::before, .demo-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border);
        }

        .demo-divider span {
          padding: 0 0.75rem;
        }

        .demo-pills-row {
          display: flex;
          gap: 0.65rem;
          width: 100%;
        }

        .demo-pill-btn {
          flex: 1;
          padding: 0.5rem 0.5rem;
          border-radius: 9999px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--gold-light);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .demo-pill-btn:hover {
          border-color: var(--gold);
          background: var(--surface-2);
          color: var(--text-bright);
          transform: translateY(-1px);
        }

        .demo-pill-btn:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 2px;
        }

        /* ─── Responsive: Screens Under 900px ─── */
        @media (max-width: 900px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            width: 100% !important;
            min-width: 0 !important;
            flex: 1 1 100% !important;
            padding: 2.5rem 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};
