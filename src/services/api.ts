import axios from 'axios';

const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('192.168.');
const api = axios.create({
  baseURL: isProduction
    ? `${window.location.protocol}//${window.location.hostname}/api/v1`
    : `http://${window.location.hostname}:4000/api/v1`,
});

// Request interceptor to add authorization headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / unauthenticated requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
