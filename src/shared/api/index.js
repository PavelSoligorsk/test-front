import axios from 'axios';
import { API_URL } from '../config';
import { clearSession } from '../lib/session';

const PUBLIC_AUTH = /\/(login|register|forgot-password|reset-password)(?:\?|$)/i;

function requestUrl(config) {
  return `${config?.baseURL || ''}${config?.url || ''}`;
}

function isPublicAuth(config) {
  return PUBLIC_AUTH.test(requestUrl(config));
}

function readStoredToken() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return session?.token || session?.access_token || localStorage.getItem('edu_token') || null;
  } catch {
    return localStorage.getItem('edu_token');
  }
}

function attachAuthInterceptors(client) {
  client.interceptors.request.use((config) => {
    if (isPublicAuth(config)) {
      if (config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Authorization');
        } else {
          delete config.headers.Authorization;
        }
      }
      return config;
    }

    const token = readStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && !isPublicAuth(error.config)) {
        clearSession();
      }
      return Promise.reject(error);
    }
  );
}

if (!axios.__eduAuthAttached) {
  attachAuthInterceptors(axios);
  axios.__eduAuthAttached = true;
}

const apiClient = axios.create({
  baseURL: API_URL,
});

attachAuthInterceptors(apiClient);

export { API_URL as API_BASE };
export default apiClient;
