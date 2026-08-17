import axios from 'axios';
import { getApiUrl } from '../lib/apiConfig';

// Centralized Axios Gateway configured with relative path or VITE_API_URL
const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor if authorization token is needed
api.interceptors.request.use(
  (config) => {
    // Inject Firebase Auth token or session token if present
    let token = localStorage.getItem('motordesk_auth_token');
    if (!token) {
      token = `motordesk_session_guest_${Date.now()}`;
      try {
        localStorage.setItem('motordesk_auth_token', token);
      } catch (e) {}
    }
    config.headers.Authorization = `Bearer ${token}`;

    const activeUserStr = localStorage.getItem('motordesk_active_user');
    if (activeUserStr) {
      try {
        const activeUser = JSON.parse(activeUserStr);
        if (activeUser?.id) {
          config.headers['X-User-Id'] = activeUser.id;
        }
        if (activeUser?.companyId) {
          config.headers['X-Company-Id'] = activeUser.companyId;
        }
        if (activeUser?.role) {
          config.headers['X-User-Role'] = activeUser.role;
        }
      } catch (e) {}
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Gateway Error]:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
