import { api } from './api';

export const transactionService = {
  getTransactions: (params) => api.get('/transactions', params),
  getTransactionById: (id) => api.get(`/transactions/${id}`),
  flagTransaction: (id) => api.patch(`/transactions/${id}/flag`),
  ingestTransactions: (data) => api.post('/transactions', data),
  uploadCsv: (formData, { dry_run = false } = {}) => {
    const query = dry_run ? '?dry_run=true' : '';
    return api.post(`/transactions/upload${query}`, formData);
  },
};
