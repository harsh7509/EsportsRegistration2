import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const getToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const { accessToken } = response.data;
        setTokens(accessToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// Scrims API
export const scrimsAPI = {
  getList: (params) => api.get('/scrims', { params }),
  getDetails: (id) => api.get(`/scrims/${id}`),
  create: (scrimData) => api.post('/scrims', scrimData),
  book: (id, playerInfo) => api.post(`/scrims/${id}/book`, playerInfo),
  getRoomCredentials: (id) => api.get(`/scrims/${id}/room`),
  uploadPoints: (id, formData) => api.post(`/scrims/${id}/points`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateScrim: (id, data) => api.put(`/scrims/${id}`, data),
  removeParticipant: (scrimId, playerId) => api.delete(`/scrims/${scrimId}/participants/${playerId}`),
  deleteScrim: (id) => api.delete(`/scrims/${id}`),
  getRoomMessages: (id) => api.get(`/scrims/${id}/room/messages`),
  sendRoomMessage: (id, data) => api.post(`/scrims/${id}/room/messages`, data),
  processPayment: (id, data) => api.post(`/scrims/${id}/payment`, data),
  rateScrim: (id, data) => api.post(`/scrims/${id}/rate`, data),
  getParticipantDetails: (id) => api.get(`/scrims/${id}/participants`),
};

// Promos API
export const promosAPI = {
  getActive: () => api.get('/promos'),
  create: (promoData) => api.post('/promos', promoData),
};

// Export utilities
export { setTokens, clearTokens, getToken };
export default api;