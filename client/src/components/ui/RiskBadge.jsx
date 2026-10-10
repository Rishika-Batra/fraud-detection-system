import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const RiskBadge = ({ level, score }) => {
  const normalizedLevel = (level || 'low').toLowerCase();

  const getIcon = () => {
    switch (normalizedLevel) {
      case 'high':
        return <AlertCircle size={14} />;
      case 'medium':
        return <AlertTriangle size={14} />;
      default:
        return <CheckCircle2 size={14} />;
    }
  };

  return (
    <span className={`badge badge-risk-${normalizedLevel}`}>
      {getIcon()}
      <span>{normalizedLevel.toUpperCase()}</span>
      {score !== undefined && score !== null && (
        <span className="mono" style={{ opacity: 0.8, marginLeft: '0.2rem' }}>
          ({score})
        </span>
      )}
    </span>
  );
};
