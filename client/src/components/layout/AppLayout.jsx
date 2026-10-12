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
  AlertTriangle,
  CheckCircle2,
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
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Shield className="brand-icon" size={28} />
          </div>
          <div className="brand-text">
            <h2>SentinelGuard</h2>
            <span className="brand-tag">Fraud Detection v1.0</span>
          </div>
        </div>

        <div className="user-profile-badge">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <div className="username">{user?.username || 'Analyst'}</div>
            <div className={`role-badge role-${user?.role || 'analyst'}`}>
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
            <LayoutDashboard size={20} />
            <span>Dashboard (FR-08)</span>
          </NavLink>

          <NavLink
            to="/cases"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Briefcase size={20} />
            <span>Case Desk (FR-09)</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <BarChart3 size={20} />
            <span>Analytics (FR-10)</span>
          </NavLink>

          {hasRole('admin', 'supervisor') && (
            <NavLink
              to="/audit"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <FileText size={20} />
              <span>Audit Logs</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
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
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="page-header-title">{title}</h1>
              <p className="page-header-subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="header-right">
            <div className="system-status-indicator">
              <span className="status-dot"></span>
              <span className="status-label">Backend Connected</span>
            </div>
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
          width: 270px;
          background-color: #0b0f19;
          border-right: 1px solid var(--border-color);
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
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.25rem;
        }

        .brand-logo {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .brand-text h2 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
        }

        .brand-tag {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .user-profile-badge {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
        }

        .username {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .role-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          display: inline-block;
        }

        .role-admin { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
        .role-supervisor { background: rgba(245, 158, 11, 0.2); color: #fde047; }
        .role-analyst { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .nav-link.active {
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%);
          border-left: 3px solid var(--primary);
          color: #fff;
          font-weight: 600;
        }

        .sidebar-footer {
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .btn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 1rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fff;
        }

        .top-header {
          height: 70px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
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
          font-size: 1.25rem;
          line-height: 1.2;
        }

        .page-header-subtitle {
          font-size: 0.775rem;
          color: var(--text-muted);
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .system-status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.75rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 9999px;
          font-size: 0.75rem;
          color: #6ee7b7;
          font-weight: 500;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }

        .header-user-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-card);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          font-size: 0.8rem;
        }

        .user-role-pill {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--primary);
        }

        .user-name-text {
          font-weight: 600;
          color: var(--text-main);
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
