import axios from 'axios';
import { env } from '../config/env';

// Centralized Axios instance
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token
api.interceptors.request.use(
  (config) => {
    // We only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error Handling & Token Expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Catch 401 Unauthorized globally to force logout
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Prevent infinite redirect loops if already on login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    // Extract backend AppError format or fallback to network error
    const message = error.response?.data?.error?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
