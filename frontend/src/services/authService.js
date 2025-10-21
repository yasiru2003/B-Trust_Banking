import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log all errors for debugging
    if (error.response?.status >= 400) {
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: originalRequest.url,
        method: originalRequest.method,
        data: error.response.data,
        requestData: originalRequest.data
      });
      
      // Log specific validation errors
      if (error.response.data?.errors) {
        console.error('Validation Errors:', error.response.data.errors);
      }
      if (error.response.data?.message) {
        console.error('Error Message:', error.response.data.message);
      }
    }
    
    // Handle rate limiting - don't try to refresh or redirect
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Please wait before making more requests.');
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Try to refresh the token
          const refreshResponse = await authService.refreshToken(token);
          if (refreshResponse.success) {
            const newToken = refreshResponse.data.token;
            localStorage.setItem('token', newToken);
            
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Don't redirect on rate limit errors during refresh
          if (refreshError.response?.status !== 429) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
      
      // If refresh fails or no token, redirect to login (but not on rate limit)
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  verifyToken: async (token) => {
    const response = await api.post('/auth/verify-token', { token });
    return response.data;
  },

  refreshToken: async (token) => {
    const response = await api.post('/auth/refresh-token', { token });
    return response.data;
  },
};

export default api;
