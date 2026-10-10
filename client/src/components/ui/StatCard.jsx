import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, trend, color = 'indigo' }) => {
  return (
    <div className="glass-card stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className={`stat-card-icon icon-${color}`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-value">{value}</div>

      {(subtext || trend) && (
        <div className="stat-card-footer">
          {trend && (
            <span className={`trend-pill ${trend.isPositive ? 'positive' : 'negative'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {subtext && <span className="stat-card-subtext">{subtext}</span>}
        </div>
      )}

      <style>{`
        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-card-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-card-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        .icon-rose { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
        .icon-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .icon-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .icon-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

        .stat-card-value {
          font-family: var(--font-heading);
          font-size: 1.85rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }

        .stat-card-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .trend-pill {
          font-size: 0.725rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .trend-pill.positive { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .trend-pill.negative { background: rgba(244, 63, 94, 0.2); color: #fca5a5; }

        .stat-card-subtext {
          font-size: 0.775rem;
          color: var(--text-dim);
        }
      `}</style>
    </div>
  );
};
