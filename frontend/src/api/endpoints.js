import { api } from './client.js';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  registerAdmin: (data) => api.post('/auth/register-admin', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

export const clientsApi = {
  getAll: (params) => api.get('/clients', params),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  toggleArchive: (id) => api.patch(`/clients/${id}/archive`),
  addContact: (id, contact) => api.post(`/clients/${id}/contacts`, contact),
  removeContact: (id, contactId) => api.delete(`/clients/${id}/contacts/${contactId}`),
  logTouchpoint: (id, data) => api.post(`/clients/${id}/touchpoints`, data),
  exportCsv: () => api.downloadCsv('/clients/export', 'clients-export.csv'),
  importCsv: (csvText) => api.post('/clients/import', { csvText }),
};

export const dealsApi = {
  getAll: (params) => api.get('/deals', params),
  getAnalytics: () => api.get('/deals/analytics'),
  getById: (id) => api.get(`/deals/${id}`),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  moveStage: (id, data) => api.patch(`/deals/${id}/stage`, data),
  delete: (id) => api.delete(`/deals/${id}`),
  exportCsv: () => api.downloadCsv('/deals/export', 'deals-export.csv'),
};

export const projectsApi = {
  getAll: (params) => api.get('/projects', params),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, userId) => api.post(`/projects/${id}/members`, { user: userId }),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

export const followUpsApi = {
  getAll: (params) => api.get('/followups', params),
  getPipeline: (params) => api.get('/followups/pipeline', params),
  getUpcoming: () => api.get('/followups/upcoming'),
  getAnalytics: () => api.get('/followups/analytics'),
  getById: (id) => api.get(`/followups/${id}`),
  create: (data) => api.post('/followups', data),
  update: (id, data) => api.put(`/followups/${id}`, data),
  logOutcome: (id, data) => api.post(`/followups/${id}/outcome`, data),
  delete: (id) => api.delete(`/followups/${id}`),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const invitationsApi = {
  getAll: (params) => api.get('/invitations', params),
  create: (data) => api.post('/invitations', data),
  revoke: (id) => api.put(`/invitations/${id}/revoke`),
  verify: (token) => api.get(`/invitations/verify/${token}`),
  accept: (data) => api.post('/invitations/accept', data),
};

export const telegramApi = {
  getConfig: () => api.get('/telegram'),
  updateConfig: (data) => api.post('/telegram', data),
  testConnection: (data = {}) => api.post('/telegram/test', data),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const activitiesApi = {
  getAll: (params) => api.get('/activities', params),
};
