import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getUsers: (params) => api.get('/auth/users', { params }),
  updateUserStatus: (id, data) => api.put(`/auth/users/${id}/status`, data),
};

// Region APIs
export const regionAPI = {
  getAll: () => api.get('/regions'),
  getById: (id) => api.get(`/regions/${id}`),
  getGeoJSON: () => api.get('/regions/geojson'),
  create: (data) => api.post('/regions', data),
  uploadGeoJSON: (formData) => api.post('/regions/upload-geojson', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/regions/${id}`, data),
  delete: (id) => api.delete(`/regions/${id}`),
  findByPoint: (lng, lat) => api.post('/regions/find-by-point', { lng, lat }),
};

// Farm APIs
export const farmAPI = {
  getAll: (params) => api.get('/farms', { params }),
  getById: (id) => api.get(`/farms/${id}`),
  getGeoJSON: () => api.get('/farms/geojson'),
  getMyFarms: () => api.get('/farms/user/my-farms'),
  create: (data) => api.post('/farms', data),
  update: (id, data) => api.put(`/farms/${id}`, data),
  updateSeason: (id, data) => api.put(`/farms/${id}/season`, data),
  delete: (id) => api.delete(`/farms/${id}`),
  revoke: (id, data) => api.put(`/farms/${id}/revoke`, data),
  getStatistics: () => api.get('/farms/admin/statistics'),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  incrementView: (id) => api.post(`/products/${id}/view`), // Separate endpoint for view count
  getMyProducts: (params) => api.get('/products/user/my-products', { params }),
  create: (formData) => api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/products/${id}`),
  getPending: (params) => api.get('/products/admin/pending', { params }),
  review: (id, data) => api.put(`/products/${id}/review`, data),
};

// Chat APIs
export const chatAPI = {
  sendMessage: (data) => api.post('/chat/message', data),
  getHistory: (sessionId) => api.get(`/chat/history/${sessionId}`),
  clearHistory: (sessionId) => api.delete(`/chat/history/${sessionId}`),
};

// CropType APIs
export const cropTypeAPI = {
  getAll: (params) => api.get('/crop-types', { params }),
  getById: (id) => api.get(`/crop-types/${id}`),
  create: (data) => api.post('/crop-types', data),
  update: (id, data) => api.put(`/crop-types/${id}`, data),
  delete: (id) => api.delete(`/crop-types/${id}`),
};

// Contact APIs
export const contactAPI = {
  create: (data) => api.post('/contacts', data),
  getMyContacts: (params) => api.get('/contacts/my-contacts', { params }),
  getById: (id) => api.get(`/contacts/${id}`),
  updateStatus: (id, data) => api.put(`/contacts/${id}/status`, data),
};

// Statistics APIs
export const statisticsAPI = {
  getPublicStats: () => api.get('/statistics/public'),
  getOverview: () => api.get('/statistics/overview'),
  getHarvestForecast: (params) => api.get('/statistics/harvest-forecast', { params }),
  getByRegion: () => api.get('/statistics/by-region'),
  getProductsByCertification: () => api.get('/statistics/products-by-certification'),
};

// Policy APIs
export const policyAPI = {
  getAll: (params) => api.get('/policies', { params }),
  getById: (id) => api.get(`/policies/${id}`),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.put(`/policies/${id}`, data),
  delete: (id) => api.delete(`/policies/${id}`),
};

// Land Request APIs
export const landRequestAPI = {
  create: (data) => api.post('/land-requests', data),
  getMyRequest: () => api.get('/land-requests/my-request'),
  getAll: (params) => api.get('/land-requests', { params }),
  updateStatus: (id, data) => api.put(`/land-requests/${id}/status`, data),
};

// Notification APIs
export const notificationAPI = {
  getMyNotifications: () => api.get('/notifications/my-notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

// Complaint APIs
export const complaintAPI = {
  create: (data) => api.post('/complaints', data),
  getMyComplaints: () => api.get('/complaints/my-complaints'),
  getAll: () => api.get('/complaints'),
  resolve: (id, data) => api.put(`/complaints/${id}/resolve`, data),
};

export default api;

