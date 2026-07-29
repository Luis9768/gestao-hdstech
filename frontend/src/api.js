import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor para injetar automaticamente o Token de Autenticação em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gestao-cpus-token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

export default api;
