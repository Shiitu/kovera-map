/**
 * @file frontend/src/services/api.ts
 * @description API service for interacting with the backend.
 */

import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kovera_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('kovera_token');
      localStorage.removeItem('kovera_role');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  provision: (data) => api.post('/auth/provision', data),
};

export const networkApi = {
  getSchematic: () => api.get('/network/schematic'),
  generate: () => api.post('/network/generate'),
  getChains: () => api.get('/network/chains'),
  exportMd: () => api.get('/network/export', { responseType: 'blob' }),
};

export const adminApi = {
  getInternalUsers: () => api.get('/admin/internal-users'),
  addInternalUser: (userId) => api.post('/admin/internal-users', { user_id: userId }),
  removeInternalUser: (userId) => api.delete(`/admin/internal-users/${userId}`),
  getTokens: () => api.get('/admin/tokens'),
};

// ── Kovera Network Map API ───────────────────────────────────────────
export const analyticsApi = {
  // 1️⃣ Network Graph (nodes + edges)
  getNetworkGraph: (excludeInternal = true, refresh = false, chainFilter: 0 | 1 | 2 | 3 = 0) =>
    api.get('/analytics/network/graph', { params: { excludeInternal, refresh, chainFilter } }),

  // 2️⃣ Network Stats (header summary)
  getNetworkStats: () =>
    api.get('/analytics/network/stats'),

  // 3️⃣ Active Chains
  getNetworkChains: (minLength = 2) =>
    api.get('/analytics/network/chains', { params: { minLength } }),

  // 4️⃣ Demand Clusters
  getNetworkClusters: (minSize = 3) =>
    api.get('/analytics/network/clusters', { params: { minSize } }),

  // 5️⃣ Address Cycles (duplicate addresses)
  getAddressCycles: () =>
    api.get('/analytics/network/address-cycles'),

  // 6️⃣ Node Detail (dynamic – per node)
  getNodeDetail: (nodeId: string) =>
    api.get(`/analytics/network/node/${nodeId}`),

  // 7️⃣ Export Network Data
  exportNetworkMd: () =>
    api.get('/analytics/network/export', { responseType: 'blob' }),

  // 8️⃣ Internal Users Filter
  getInternalUsers: () =>
    api.get('/analytics/network/internal-users'),

  // Update Internal Users
  updateInternalUsers: (internalUserIds: string[]) =>
    api.put('/analytics/network/internal-users', { internalUserIds }),

  // Refresh/Geocode
  refreshGeocode: () =>
    api.post('/analytics/network/refresh'),
};

export default api;
