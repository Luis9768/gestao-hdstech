import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor para injetar automaticamente o Token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gestao-cpus-token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para capturar 401 (token expirado ou inválido) e deslogar com segurança
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.url.includes('/login')
    ) {
      localStorage.removeItem('gestao-cpus-token');
      localStorage.removeItem('gestao-cpus-user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

export default api;
