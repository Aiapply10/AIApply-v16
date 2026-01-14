import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getProfileCompleteness: () => api.get('/auth/profile-completeness'),
  createSession: (sessionId) => api.post('/auth/session', {}, {
    headers: { 'X-Session-ID': sessionId }
  }),
  linkedinCallback: (code, redirectUri) => api.post('/auth/linkedin/callback', {
    code,
    redirect_uri: redirectUri
  }),
  uploadProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteProfilePhoto: () => api.delete('/auth/profile-photo'),
  // OTP Verification
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  registerWithOTP: (data) => api.post('/auth/register-with-otp', data),
};

// Resume API
export const resumeAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: () => api.get('/resumes'),
  getOne: (id) => api.get(`/resumes/${id}`),
  tailor: (data) => api.post('/resumes/tailor', data),
  optimize: (id, data) => api.post(`/resumes/${id}/optimize`, data),
  download: (id, format) => api.get(`/resumes/${id}/download/${format}`, {
    responseType: 'blob',
  }),
  remove: (id) => api.delete(`/resumes/${id}`),
  generateWord: (id, data) => api.post(`/resumes/${id}/generate-word`, data, {
    responseType: 'blob',
  }),
  // New endpoints for resume analysis and enhancement
  analyze: (id) => api.post(`/resumes/${id}/analyze`),
  createMaster: (id) => api.post(`/resumes/${id}/create-master`),
  generateVersions: (id, data) => api.post(`/resumes/${id}/generate-versions`, data),
};

// Cover Letter API
export const coverLetterAPI = {
  generate: (data) => api.post('/cover-letter/generate', data),
};

// Job Portals API
export const jobPortalAPI = {
  getAll: (technology) => api.get('/job-portals', { params: { technology } }),
  create: (data) => api.post('/job-portals', data),
  update: (id, data) => api.put(`/job-portals/${id}`, data),
  delete: (id) => api.delete(`/job-portals/${id}`),
};

// Applications API
export const applicationAPI = {
  create: (data) => api.post('/applications', data),
  getAll: (status) => api.get('/applications', { params: { status } }),
  updateStatus: (id, status) => api.put(`/applications/${id}/status?status=${status}`),
};

// Emails API
export const emailAPI = {
  create: (data) => api.post('/emails', data),
  getAll: (applicationId) => api.get('/emails', { params: { application_id: applicationId } }),
  generateReply: (data) => api.post('/emails/generate-reply', data),
};

// Reports API
export const reportAPI = {
  getCandidate: () => api.get('/reports/candidate'),
  getAdmin: () => api.get('/reports/admin'),
  getAllCandidates: (skip, limit) => api.get('/reports/admin/candidates', { params: { skip, limit } }),
};

// Live Jobs API (JSearch)
export const liveJobsAPI = {
  search: (query, location, employmentType, page = 1) => 
    api.get('/live-jobs/search', { 
      params: { query, location, employment_type: employmentType, page } 
    }),
  getRecommendations: () => api.get('/live-jobs/recommendations'),
  getDetails: (jobId) => api.get(`/live-jobs/${jobId}`),
};

// Technologies API
export const technologiesAPI = {
  getAll: () => api.get('/technologies'),
};

// Auto-Apply API
export const autoApplyAPI = {
  getSettings: () => api.get('/auto-apply/settings'),
  updateSettings: (data) => api.post('/auto-apply/settings', data),
  toggle: () => api.post('/auto-apply/toggle'),
  getHistory: (limit = 50) => api.get('/auto-apply/history', { params: { limit } }),
  run: () => api.post('/auto-apply/run'),
  getStatus: () => api.get('/auto-apply/status'),
};

// Email Center API
export const emailCenterAPI = {
  // Account Management
  getAccounts: () => api.get('/email-center/accounts'),
  connectIMAP: (data) => api.post('/email-center/connect/imap', data),
  initGmail: () => api.post('/email-center/connect/gmail/init'),
  initOutlook: () => api.post('/email-center/connect/outlook/init'),
  disconnectAccount: (accountId) => api.delete(`/email-center/accounts/${accountId}`),
  setPrimaryAccount: (accountId) => api.put(`/email-center/accounts/${accountId}/primary`),
  
  // Inbox & Email Operations
  getInbox: (accountId, limit = 20) => api.get('/email-center/inbox', { 
    params: { account_id: accountId, limit } 
  }),
  sendEmail: (data) => api.post('/email-center/send', data),
  
  // AI Features
  composeApplication: (data) => api.post('/email-center/ai/compose-application', data),
  draftReply: (data) => api.post('/email-center/ai/draft-reply', data),
  
  // Settings & History
  getSettings: () => api.get('/email-center/settings'),
  updateSettings: (data) => api.post('/email-center/settings', data),
  getHistory: (limit = 50) => api.get('/email-center/history', { params: { limit } }),
};

export default api;
