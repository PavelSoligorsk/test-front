import axios from 'axios';
import { API_URL } from '../config';
import { clearSession } from '../lib/session';

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

// Интерцептор для обработки 401 — полностью очищаем сессию,
// clearSession удаляет токены из localStorage, sessionStorage, cookie,
// сбрасывает axios-заголовок и генерирует SESSION_EVENT,
// который подхватывает PrivateRoute и делает редирект на /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);

export { API_URL as API_BASE };
export default apiClient;
