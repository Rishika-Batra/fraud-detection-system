import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, trend, color = 'indigo', valueColor }) => {
  const getValueColorClass = () => {
    if (valueColor === 'bright') return 'value-bright';
    if (valueColor === 'gold-light') return 'value-gold-light';
    if (valueColor === 'danger') return 'value-danger';
    if (valueColor === 'green') return 'value-green';

    switch (color) {
      case 'rose':
        return 'value-danger';
      case 'amber':
        return 'value-gold-light';
      case 'emerald':
        return 'value-green';
      default:
        return 'value-bright';
    }
  };

  return (
    <div className="glass-card stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className={`stat-card-icon icon-${color}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className={`stat-card-value ${getValueColorClass()}`}>{value}</div>

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
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          position: relative;
          overflow: hidden;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-card-title {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .stat-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-indigo, .icon-gold { background: rgba(201, 162, 75, 0.12); color: var(--gold-light); border: 1px solid var(--gold-border); }
        .icon-rose, .icon-danger { background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger); }
        .icon-amber { background: var(--amber-bg); color: var(--gold-light); border: 1px solid var(--gold-border); }
        .icon-emerald, .icon-green { background: rgba(79, 214, 160, 0.12); color: var(--green); border: 1px solid rgba(79, 214, 160, 0.3); }
        .icon-blue { background: rgba(201, 162, 75, 0.12); color: var(--gold); border: 1px solid var(--gold-border); }

        .stat-card-value {
          font-family: var(--font-mono);
          font-size: 34px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .value-bright { color: var(--text-bright); }
        .value-gold-light { color: var(--gold-light); }
        .value-danger { color: var(--danger); }
        .value-green { color: var(--green); }

        .stat-card-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .trend-pill {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .trend-pill.positive { background: rgba(79, 214, 160, 0.15); color: var(--green); }
        .trend-pill.negative { background: var(--danger-bg); color: var(--danger-text); }

        .stat-card-subtext {
          font-size: 0.775rem;
          color: var(--text-soft);
        }
      `}</style>
    </div>
  );
};
