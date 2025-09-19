import axios from 'axios';

const API_BASE_URL = '/api'; // ⬅ keep everything on the same base (works with your Vite proxy/dev server)

// Create axios instance
const api = axios.create({
  baseURL: '/api', // ⬅ unchanged from your working setup
  
});

// Token management
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const getToken = () => localStorage.getItem(ACCESS_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

// helper to store tokens (already used by Login/Signup)
 const setTokens = (access, refresh) => {
  if (access) localStorage.setItem('accessToken', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
  api.defaults.headers.common.Authorization = `Bearer ${access}`;
};

// Profile API (player's own data)
export const profileAPI = {
  myBookings: () => api.get('/profile/bookings'),
};

const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  delete api.defaults.headers.common.Authorization;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearTokens();
          return Promise.reject(error);
        }

        // Use axios (NOT the api instance) so we don't run into interceptor recursion.
        // Keep base consistent: '/api' (same origin) to avoid CORS/port mismatches.
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, {
          headers: { 'Content-Type': 'application/json' },
        });

        // Accept multiple token key names from backend
        const newAccess =
          response?.data?.accessToken ||
          response?.data?.access_token ||
          response?.data?.token;

        const newRefresh =
          response?.data?.refreshToken ||
          response?.data?.refresh_token ||
          refreshToken;

        if (!newAccess) {
          clearTokens();
          return Promise.reject(new Error('Refresh failed: no access token'));
        }

        // Persist + update default header
        setTokens(newAccess, newRefresh);

        // Retry original request with new token
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  switchRole: (role) => api.post('/auth/switch-role', { role }),
  sendOtp: (body) => api.post('/auth/otp/send', body),      // { tempToken, channel: 'email' | 'phone' }
  verifyOtp: (body) => api.post('/auth/otp/verify', body),
};

// Upload API
export const uploadAPI = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Scrims API
export const scrimsAPI = {
  getList: (params) => api.get('/scrims', { params }),
  getDetails: (id) => api.get(`/scrims/${id}`),
  create: (scrimData) => api.post('/scrims', scrimData),
  book: (id, playerInfo) => api.post(`/scrims/${id}/book`, playerInfo),
  getRoomCredentials: (id) => api.get(`/scrims/${id}/room`),
  uploadPoints: (id, formData) =>
    api.post(`/scrims/${id}/points`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateScrim: (id, data) => api.put(`/scrims/${id}`, data),
  removeParticipant: (scrimId, playerId) =>
    api.delete(`/scrims/${scrimId}/participants/${playerId}`),
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

export const tournamentsAPI = {
  // public
  list: (params) => api.get('/tournaments', { params }),
  get: (id) => api.get(`/tournaments/${id}`),

  // org/admin
  create: (data) => api.post('/tournaments', data),
  update: (id, data) => api.put(`/tournaments/${id}`, data),
  deleteTournament: (tid) => api.delete(`/tournaments/${tid}`),

  // registration
  // registration (✅ accepts payload now)
  
  register: (tournamentId, data) => api.post(`/tournaments/${tournamentId}/register`, data),

  // participants & groups (protected)
  getParticipants: (tournamentId) => api.get(`/tournaments/${tournamentId}/participants`),
  removeParticipant: (tournamentId, userId) =>
    api.delete(`/tournaments/${tournamentId}/participants/${userId}`),
  createGroup: (id, payload) => api.post(`/tournaments/${id}/groups`, payload),
  listGroups: (tournamentId) => api.get(`/tournaments/${tournamentId}/groups`),

  getMyGroupTeams: (id) => api.get(`/tournaments/${id}/my-group/teams`),
  addGroupMember: (tournamentId, groupId, body) =>
    api.post(`/tournaments/${tournamentId}/groups/${groupId}/members`, body),

  // auto group (single definition)
  autoGroup: (tournamentId, size = 4) =>
    api.post(`/tournaments/${tournamentId}/groups/auto`, {}, { params: { size } }),

  // group rooms (org/admin)
  createGroupRoom: (tournamentId, groupId) =>
    api.post(`/tournaments/${tournamentId}/groups/${groupId}/room`),
  getGroupRoomMessages: (tournamentId, groupId) =>
    api.get(`/tournaments/${tournamentId}/groups/${groupId}/room/messages`),
  sendGroupRoomMessage: (tournamentId, groupId, body) =>
    api.post(`/tournaments/${tournamentId}/groups/${groupId}/room/messages`, body),
  editGroupRoomMessage: (tid, gid, mid, body) =>
    api.patch(`/tournaments/${tid}/groups/${gid}/room/messages/${mid}`, body),
  deleteGroupRoomMessage: (tid, gid, mid) =>
    api.delete(`/tournaments/${tid}/groups/${gid}/room/messages/${mid}`),

  // group admin ops
  renameGroup: (tid, gid, name) =>
    api.post(`/tournaments/${tid}/groups/${gid}/rename`, { name }),
  removeGroupMember: (tid, gid, userId) =>
    api.post(`/tournaments/${tid}/groups/${gid}/remove-member`, { userId }),
  moveGroupMember: (tid, payload) =>
    api.post(`/tournaments/${tid}/groups/move-member`, payload),

  // player/self
  myGroup: (id) => api.get(`/tournaments/${id}/my-group`),
  getMyGroupRoomMessages: (id) => api.get(`/tournaments/${id}/my-group/room/messages`),
  sendMyGroupRoomMessage: (id, body) => api.post(`/tournaments/${id}/my-group/room/messages`, body),
  editMyGroupRoomMessage: (tid, mid, body) =>
    api.patch(`/tournaments/${tid}/my-group/room/messages/${mid}`, body),
  deleteMyGroupRoomMessage: (tid, mid) =>
    api.delete(`/tournaments/${tid}/my-group/room/messages/${mid}`),

  deleteGroupRoom: (tid, gid) =>
  api.delete(`/tournaments/${tid}/groups/${gid}/room`),
  deleteGroup: (tid, gid) => api.delete(`/tournaments/${tid}/groups/${gid}`),
};





// Organizations API (with safe fallbacks to /orgs if /organizations not mounted)
export const organizationsAPI = {
  getRankings: async (params) => {
    try {
      return await api.get('/organizations/rankings', { params });
    } catch (e) {
      if (e?.response?.status === 404) {
        return api.get('/orgs/rankings', { params });
      }
      throw e;
    }
  },
  getDetails: async (orgId) => {
    try {
      return await api.get(`/organizations/${orgId}`);
    } catch (e) {
      if (e?.response?.status === 404) {
        return api.get(`/orgs/${orgId}`);
      }
      throw e;
    }
  },
  getOrganizationProfile: (orgId) => api.get(`/orgs/${orgId}`),
  updateOrganizationRanking: (orgId, ranking) => api.put(`/orgs/${orgId}/ranking`, { ranking }),
  getAllOrganizations: () => api.get('/orgs'),
  rate: (orgId, data) => api.post(`/organizations/${orgId}/rate`, data),
    // KYC
  submitKyc: (formData) =>
    api.post('/orgs/verify/submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  myKyc: () => api.get('/orgs/verify/me'),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getPromotions: (params) => api.get('/admin/promotions', { params }),
  createPromotion: (data) => api.post('/admin/promotions', data),
  updatePromotion: (promoId, data) => api.put(`/admin/promotions/${promoId}`, data),
  deletePromotion: (promoId) => api.delete(`/admin/promotions/${promoId}`),
  trackPromoClick: (promoId) => api.post(`/admin/promotions/${promoId}/click`),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  


   listScrims:   (params) => api.get('/admin/scrims', { params }),
  listTournaments: (params) => api.get('/admin/tournaments', { params }),
  listBookings: (params) => api.get('/admin/bookings', { params }),
  listPayments: (params) => api.get('/admin/payments', { params }),
  listRatings:  (params) => api.get('/admin/ratings', { params }),

  // org controls
  setOrgVerified: (userId, verified) => api.post(`/admin/orgs/${userId}/verify`, { verified }),
  setOrgRanking:  (userId, ranking)  => api.post(`/admin/orgs/${userId}/ranking`, { ranking }),
    // KYC review
  listOrgKyc: () => api.get('/admin/org-kyc'),
  reviewOrgKyc: (userId, action, notes) => api.post(`/admin/org-kyc/${userId}/review`, { action, notes }),
};



// Export utilities
export { setTokens, clearTokens, getToken };
export default api;


