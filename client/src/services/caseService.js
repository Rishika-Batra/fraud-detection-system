import { api } from './api';

export const caseService = {
  getCases: (params) => api.get('/cases', params),
  getCaseById: (id) => api.get(`/cases/${id}`),
  updateStatus: (id, status, note) => api.patch(`/cases/${id}/status`, { status, note }),
  addNote: (id, note) => api.post(`/cases/${id}/notes`, { note }),
  assignCase: (id, assigned_to) => api.patch(`/cases/${id}/assign`, { assigned_to }),
};
