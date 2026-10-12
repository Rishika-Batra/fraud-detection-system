import { api } from './api';

export const reportService = {
  getSummary: (params) => api.get('/reports/summary', params),
  getTrends: (params) => api.get('/reports/trends', params),
  getHeatmap: (params) => api.get('/reports/heatmap', params),
  exportData: async (format, type, filters = {}) => {
    const blob = await api.get('/reports/export', { format, type, ...filters });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
