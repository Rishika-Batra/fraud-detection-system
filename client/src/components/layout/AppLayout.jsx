import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  FileText,
  LogOut,
  User,
  Menu,
  X,
  UploadCloud,
} from 'lucide-react';

export const AppLayout = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return { title: 'Transaction Monitoring', subtitle: 'FR-08 Real-Time High Risk Signal Feed' };
      case '/cases':
        return { title: 'Case Management', subtitle: 'FR-09 Fraud Investigation & Workflow Desk' };
      case '/reports':
        return { title: 'Analytics & Intelligence', subtitle: 'FR-10 Risk Trends, Heatmaps & Reports' };
      case '/upload':
        return { title: 'Upload Data', subtitle: 'CSV Bulk Transaction Ingestion & Validation' };
      case '/audit':
        return { title: 'Audit Trail', subtitle: 'System Activity & Security Logging' };
      default:
        if (location.pathname.startsWith('/cases/')) {
          return { title: 'Case Investigation Workspace', subtitle: 'FR-09 Deep-dive evidence & status control' };
        }
        return { title: 'SentinelGuard Dashboard', subtitle: 'Enterprise Fraud Detection Platform' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="app-container">
      {/* Sidebar (248px) */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Shield className="brand-icon" size={24} />
          </div>
          <div className="brand-text">
            <h2>SENTINELGUARD</h2>
            <span className="brand-tag">FRAUD DESK v1.0</span>
          </div>
        </div>

        <div className="user-profile-badge">
          <div className="avatar">
            <User size={16} />
          </div>
          <div className="user-info">
            <div className="username">{user?.username || 'Analyst'}</div>
            <div className="role-chip">
              {user?.role || 'analyst'}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard (FR-08)</span>
          </NavLink>

          <NavLink
            to="/cases"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Briefcase size={18} />
            <span>Case Desk (FR-09)</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <BarChart3 size={18} />
            <span>Analytics (FR-10)</span>
          </NavLink>

          {hasRole('analyst', 'supervisor') && (
            <NavLink
              to="/upload"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <UploadCloud size={18} />
              <span>Upload Data</span>
            </NavLink>
          )}

          {hasRole('admin', 'supervisor') && (
            <NavLink
              to="/audit"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <FileText size={18} />
              <span>Audit Logs</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <h1 className="page-header-title">{title}</h1>
              <p className="page-header-subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="header-right">
            <div className="header-user-tag">
              <span className="user-role-pill">{user?.role}</span>
              <span className="user-name-text">{user?.username}</span>
            </div>
          </div>
        </header>

        <div className="page-body">
          <Outlet />
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 248px;
          min-width: 248px;
          background-color: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 1.5rem 1rem;
          transition: transform 0.3s ease;
          z-index: 100;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1.25rem;
        }

        .brand-logo {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--gold-border);
          background: rgba(201, 162, 75, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
        }

        .brand-text h2 {
          font-family: var(--font-serif);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--gold-light);
          letter-spacing: 0.12em;
          line-height: 1.2;
        }

        .brand-tag {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
        }

        .user-profile-badge {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold-light);
        }

        .username {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-bright);
        }

        .role-chip {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          border: 1px solid var(--gold-border);
          background: rgba(201, 162, 75, 0.08);
          color: var(--gold-light);
          display: inline-block;
          margin-top: 0.2rem;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.85rem;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .nav-link:hover {
          background: var(--surface-2);
          color: var(--text-bright);
        }

        .nav-link.active {
          background: rgba(15, 61, 44, 0.35);
          border-left: 3px solid var(--gold);
          color: var(--gold-light);
          font-weight: 600;
        }

        .sidebar-footer {
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        .btn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.825rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          border-color: var(--danger);
          background: var(--danger-bg);
          color: var(--danger-text);
        }

        .top-header {
          height: 64px;
          background: rgba(11, 16, 14, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .page-header-title {
          font-family: var(--font-serif);
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-bright);
          letter-spacing: 0.04em;
          line-height: 1.2;
        }

        .page-header-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text);
          cursor: pointer;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-user-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--surface);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          font-size: 0.8rem;
        }

        .user-role-pill {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--gold);
        }

        .user-name-text {
          font-weight: 600;
          color: var(--text-bright);
        }

        @media (max-width: 900px) {
          .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .mobile-menu-btn {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};
