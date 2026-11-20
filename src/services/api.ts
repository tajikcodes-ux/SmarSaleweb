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
    if (error.response) {
      // A refused sign-in is answered on the login form, not treated as an expired session
      const isSignIn = String(error.config?.url || '').includes('/auth/');
      if (error.response.status === 401 && !isSignIn) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (error.response.status === 403 && error.response.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
        // The password was reset meanwhile: everything waits until the user picks a new one
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...user, mustChangePassword: true }));
        } catch {
          /* the change-password page works without the stored user */
        }
        if (window.location.pathname !== '/change-password') window.location.href = '/change-password';
      } else if (error.response.status === 403 && error.config?.method !== 'get') {
        // Pages load optional widgets the role may not have; a denied read is not an error to show
        alert(error.response.data?.message || 'Доступ запрещен: у вашей роли нет прав на выполнение этого действия.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
