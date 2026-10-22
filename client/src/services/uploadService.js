import { api } from './api';

export const uploadService = {
  uploadCsv: (formData, { dry_run = false } = {}) => {
    const query = dry_run ? '?dry_run=true' : '';
    return api.post(`/transactions/upload${query}`, formData);
  },
};

export default uploadService;
