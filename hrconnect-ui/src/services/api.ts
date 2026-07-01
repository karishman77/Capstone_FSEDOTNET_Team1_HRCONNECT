import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: (email: string, password: string, fullName: string) =>
    api.post('/api/auth/register', { email, password, fullName }),
  
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  getProfile: () => api.get('/api/users/me'),

  updateProfile: (fullName: string) =>
    api.put('/api/users/me', { fullName }),
};

export const employeeService = {
  getAll: () => api.get('/api/employees'),
  getById: (id: string) => api.get(`/api/employees/${id}`),
  search: (name?: string, department?: string) =>
    api.get('/api/employees', { params: { name, department } }),
  create: (data: any) => api.post('/api/employees', data),
  update: (id: string, data: any) => api.put(`/api/employees/${id}`, data),
  delete: (id: string) => api.delete(`/api/employees/${id}`),
};

export const leaveService = {
  getAll: () => api.get('/api/leaves'),
  getAnalytics: () => api.get('/api/leaves/analytics'),
  applyCarryForward: (fromYear?: number, toYear?: number, maxCarryForwardDays = 5) =>
    api.post('/api/leaves/carry-forward', null, {
      params: { fromYear, toYear, maxCarryForwardDays },
    }),
  exportExcel: () =>
    api.get('/api/leaves/export/excel', {
      responseType: 'blob',
    }),
  getById: (id: string) => api.get(`/api/leaves/${id}`),
  getByEmployee: (employeeId: string) => api.get(`/api/leaves/employee/${employeeId}`),
  getMine: () => api.get('/api/leaves/mine'),
  getMyBalances: () => api.get('/api/leaves/balances/my'),
  create: (data: any) => api.post('/api/leaves', data),
  updateStatus: (id: string, data: any) => api.put(`/api/leaves/${id}/status`, data),
  cancel: (id: string) => api.put(`/api/leaves/${id}/cancel`),
  getBalances: (employeeId: string) => api.get(`/api/leaves/${employeeId}/balances`),
};

export default api;
