// src/services/api.js
import axios from 'axios';

/**
 * ORIGIN resolution rules:
 * 1) Prefer VITE_API_URL (what you set on Vercel)
 * 2) Fallback to VITE_API_BASE_URL (if you also set it)
 * 3) Dev only: http://localhost:4000
 * 4) (Optional) As a last resort for setups that proxy /api on same origin, use '/api'
 *    — but since you've already set envs on Vercel, #1 will be used in production.
 */
const RAW_ORIGIN =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:4000' : null);

if (!RAW_ORIGIN) {
  // Crash loud in production to avoid silently hitting localhost
  throw new Error(
    'Missing VITE_API_URL (or VITE_API_BASE_URL). Add it in Vercel → Project → Settings → Environment Variables.'
  );
}

export const ORIGIN = RAW_ORIGIN.replace(/\/+$/, ''); // trim trailing slash
export const API_BASE = `${ORIGIN}/api`;

// Create axios instance
export const api = axios.create({
  
  baseURL: API_BASE,
  // Set to true ONLY if you actually use cookies cross-site (SameSite=None; Secure)
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
const existing = localStorage.getItem('accessToken');
if (existing) {
  api.defaults.headers.common.Authorization = `Bearer ${existing}`;
}

// ========== Token management ==========
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const getToken = () => localStorage.getItem(ACCESS_KEY) || '';
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || '';

export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  if (access) api.defaults.headers.common.Authorization = `Bearer ${access}`;
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  delete api.defaults.headers.common.Authorization;
};

// ========== Interceptors ==========
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);


/**
 * 401 refresh flow:
 * - uses PLAIN axios (not the api instance) to avoid interceptor recursion
 * - fixed bug: use API_BASE here (not undefined API_BASE_URL)
 */
api.interceptors.response.use(
  (res) => res,
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

        const resp = await axios.post(
          `${API_BASE}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccess =
          resp?.data?.accessToken ||
          resp?.data?.access_token ||
          resp?.data?.token;

        const newRefresh =
          resp?.data?.refreshToken ||
          resp?.data?.refresh_token ||
          refreshToken;

        if (!newAccess) {
          clearTokens();
          return Promise.reject(new Error('Refresh failed: no access token'));
        }

        setTokens(newAccess, newRefresh);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (e) {
        clearTokens();
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

// ========== APIs ==========
export const authAPI = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  switchRole: (role) => api.post('/auth/switch-role', { role }),
  sendOtp: (body) => api.post('/auth/otp/send', body),
  verifyOtp: (body) => api.post('/auth/otp/verify', body),
};

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const profileAPI = {
  myBookings: () => api.get('/profile/bookings'),
};

export const scrimsAPI = {
  getList: (params) => api.get('/scrims', { params }),
  getDetails: (id) => api.get(`/scrims/${id}`),
  create: (data) => api.post('/scrims', data),
  book: (id, body) => api.post(`/scrims/${id}/book`, body),
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

export const promosAPI = {
  getActive: () => api.get('/promos'),
  create: (data) => api.post('/promos', data),
};

export const tournamentsAPI = {
  list: (params) => api.get('/tournaments', { params }),
  get: (id) => api.get(`/tournaments/${id}`),

  create: (data) => api.post('/tournaments', data),
  update: (id, data) => api.put(`/tournaments/${id}`, data),
  deleteTournament: (tid) => api.delete(`/tournaments/${tid}`),

  register: (tournamentId, data) =>
    api.post(`/tournaments/${tournamentId}/register`, data),

  getParticipants: (tournamentId) =>
    api.get(`/tournaments/${tournamentId}/participants`),
  removeParticipant: (tournamentId, userId) =>
    api.delete(`/tournaments/${tournamentId}/participants/${userId}`),

  createGroup: (id, payload) => api.post(`/tournaments/${id}/groups`, payload),
  listGroups: (tournamentId) => api.get(`/tournaments/${tournamentId}/groups`),

  getMyGroupTeams: (id) => api.get(`/tournaments/${id}/my-group/teams`),
  addGroupMember: (tournamentId, groupId, body) =>
    api.post(`/tournaments/${tournamentId}/groups/${groupId}/members`, body),

  autoGroup: (tournamentId, size = 4) =>
    api.post(`/tournaments/${tournamentId}/groups/auto`, {}, { params: { size } }),

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

  renameGroup: (tid, gid, name) =>
    api.post(`/tournaments/${tid}/groups/${gid}/rename`, { name }),
  removeGroupMember: (tid, gid, userId) =>
    api.post(`/tournaments/${tid}/groups/${gid}/remove-member`, { userId }),
  moveGroupMember: (tid, payload) =>
    api.post(`/tournaments/${tid}/groups/move-member`, payload),

  myGroup: (id) => api.get(`/tournaments/${id}/my-group`),
  getMyGroupRoomMessages: (id) => api.get(`/tournaments/${id}/my-group/room/messages`),
  sendMyGroupRoomMessage: (id, body) =>
    api.post(`/tournaments/${id}/my-group/room/messages`, body),
  editMyGroupRoomMessage: (tid, mid, body) =>
    api.patch(`/tournaments/${tid}/my-group/room/messages/${mid}`, body),
  deleteMyGroupRoomMessage: (tid, mid) =>
    api.delete(`/tournaments/${tid}/my-group/room/messages/${mid}`),

  deleteGroupRoom: (tid, gid) => api.delete(`/tournaments/${tid}/groups/${gid}/room`),
  deleteGroup: (tid, gid) => api.delete(`/tournaments/${tid}/groups/${gid}`),
  


};

// Organizations API (with /organizations → /orgs fallback)
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
  updateOrganizationRanking: (orgId, ranking) =>
    api.put(`/orgs/${orgId}/ranking`, { ranking }),
  getAllOrganizations: () => api.get('/orgs'),
  rate: (orgId, data) => api.post(`/organizations/${orgId}/rate`, data),

  submitKyc: (formData) =>
    api.post('/orgs/verify/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

  listScrims: (params) => api.get('/admin/scrims', { params }),
  listTournaments: (params) => api.get('/admin/tournaments', { params }),
  listBookings: (params) => api.get('/admin/bookings', { params }),
  listPayments: (params) => api.get('/admin/payments', { params }),
  listRatings: (params) => api.get('/admin/ratings', { params }),

  setOrgVerified: (userId, verified) => api.post(`/admin/orgs/${userId}/verify`, { verified }),
  setOrgRanking: (userId, ranking) => api.post(`/admin/orgs/${userId}/ranking`, { ranking }),

  // src/services/api.js
updateScrim: (id, payload) => api.patch(`/admin/scrims/${id}`, payload), // ✅ uses authorized instance

 deleteScrim: (id) => api.delete(`/admin/scrims/${id}`),
 listScrimParticipants: (id) => api.get(`/admin/scrims/${id}/participants`),
 addPlayerToScrim: (id, playerId) => api.post(`/admin/scrims/${id}/participants`, { playerId }),
 removePlayerFromScrim: (id, playerId) => api.delete(`/admin/scrims/${id}/participants/${playerId}`),

  listOrgKyc: () => api.get('/admin/org-kyc'),
  reviewOrgKyc: (userId, action, notes) =>
    api.post(`/admin/org-kyc/${userId}/review`, { action, notes }),
};

export default api;
