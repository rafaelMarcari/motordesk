import axios from 'axios';

// Centralized Axios Gateway configured with VITE_API_URL for Cloud Run Backend
const API_URL = import.meta.env.VITE_API_URL || 'https://motordesk-605741677403.us-east1.run.app';

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
    // Inject Firebase Auth token or session token if present (or fallback guest session)
    let token = localStorage.getItem('motordesk_auth_token');
    if (!token) {
      token = `motordesk_session_guest_${Date.now()}`;
      try {
        localStorage.setItem('motordesk_auth_token', token);
      } catch (e) {}
    }
    config.headers.Authorization = `Bearer ${token}`;
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
