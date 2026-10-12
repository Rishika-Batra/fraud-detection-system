import React from 'react';
import { Flag, Search, CheckCircle, AlertOctagon, Archive } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'flagged').toLowerCase();

  const getIcon = () => {
    switch (normalizedStatus) {
      case 'flagged':
        return <Flag size={13} />;
      case 'investigating':
        return <Search size={13} />;
      case 'resolved':
        return <CheckCircle size={13} />;
      case 'escalated':
        return <AlertOctagon size={13} />;
      case 'closed':
        return <Archive size={13} />;
      default:
        return null;
    }
  };

  return (
    <span className={`badge badge-status-${normalizedStatus}`}>
      {getIcon()}
      <span>{normalizedStatus}</span>
    </span>
  );
};
