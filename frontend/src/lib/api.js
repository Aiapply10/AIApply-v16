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
  createSession: (sessionId) => api.post('/auth/session', {}, {
    headers: { 'X-Session-ID': sessionId }
  }),
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
  download: (id, format) => api.get(`/resumes/${id}/download/${format}`, {
    responseType: 'blob',
  }),
  delete: (id) => api.delete(`/resumes/${id}`),
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

// Technologies API
export const technologiesAPI = {
  getAll: () => api.get('/technologies'),
};

export default api;
