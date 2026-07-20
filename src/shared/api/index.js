import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
});

// Интерцептор для добавления токена авторизации
apiClient.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const token = session?.token || session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// Интерцептор для обработки 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('edu_session');
      sessionStorage.removeItem('edu_session');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { API_URL as API_BASE };
export default apiClient;
