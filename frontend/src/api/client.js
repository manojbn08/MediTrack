import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meditrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('meditrack_refresh_token');
      if (refreshToken && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:8080/api') + '/auth/refresh', {
            refreshToken,
          });
          const newAuth = res.data?.data;
          if (newAuth?.token) {
            localStorage.setItem('meditrack_token', newAuth.token);
            if (newAuth.refreshToken) {
              localStorage.setItem('meditrack_refresh_token', newAuth.refreshToken);
            }
            api.defaults.headers.common.Authorization = `Bearer ${newAuth.token}`;
            processQueue(null, newAuth.token);
            originalRequest.headers.Authorization = `Bearer ${newAuth.token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('meditrack_token');
          localStorage.removeItem('meditrack_refresh_token');
          localStorage.removeItem('meditrack_user');
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
