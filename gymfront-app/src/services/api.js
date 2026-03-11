import axios from 'axios';
import toast from 'react-hot-toast'; // ✅ FIX: was missing — caused interceptor crash → redirect to /login

// const API_BASE_URL = 'https://api.gymmonitor.in';

const API_BASE_URL = 'http://localhost:8001'; // for local host

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Attach access token to every request ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Auto-refresh on 401, but ONLY log out when refresh itself fails ────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isRefreshCall = originalRequest.url?.includes('/refresh');
    const isLoginCall = originalRequest.url?.includes('/login');

    if (is401 && !alreadyRetried && !isRefreshCall && !isLoginCall) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/refresh`, {
          refresh_token: refreshToken,
        });

        if (response.data?.access_token) {
          localStorage.setItem('access_token', response.data.access_token);
          if (response.data.refresh_token) {
            localStorage.setItem('refresh_token', response.data.refresh_token);
          }
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // ✅ FIX: toast was used here but never imported — this crashed the interceptor
    // on every 403, which caused unhandled promise rejections that could break
    // the entire request pipeline and appear as a logout.
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response?.data);
      toast.error('You do not have permission to perform this action');
    }

    if (error.response?.status === 422) {
      console.error('Validation error:', error.response.data);
      // Don't redirect, just show validation errors
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;