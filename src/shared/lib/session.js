import axios from 'axios';

const STORAGE_KEY = 'edu_session';
export const SESSION_EVENT = 'edu_session_change';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/**
 * Вспомогательное событие для уведомления React-компонентов
 */
function notifySessionChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}

/**
 * Надежное восстановление сессии из всех источников
 */
export function restoreSession() {
  let userData = null;

  // 1. Пробуем из localStorage
  try {
    const saved = getStorage()?.getItem(STORAGE_KEY);
    if (saved) userData = JSON.parse(saved);
  } catch (e) {}

  // 2. Если нет — пробуем из sessionStorage
  if (!userData) {
    try {
      const saved = getSessionStorage()?.getItem(STORAGE_KEY);
      if (saved) userData = JSON.parse(saved);
    } catch (e) {}
  }

  // 3. Устанавливаем заголовок axios
  const token = userData?.token || userData?.access_token;
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  return userData && userData.role ? userData : null;
}

/**
 * Сохранение сессии
 */
export function saveSession(userData) {
  if (!userData) return;

  const data = JSON.stringify(userData);

  try {
    getStorage()?.setItem(STORAGE_KEY, data);
    getSessionStorage()?.setItem(STORAGE_KEY, data);

    const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(data)}; expires=${expires}; path=/; samesite=lax`;
  } catch (e) {
    console.error('Не удалось сохранить сессию:', e);
  }

  const token = userData.token || userData.access_token;
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  notifySessionChange();
}

/**
 * Удаление сессии
 */
export function clearSession() {
  try {
    getStorage()?.removeItem(STORAGE_KEY);
    getSessionStorage()?.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {}

  delete axios.defaults.headers.common['Authorization'];
  notifySessionChange();
}

/**
 * Получение текущего пользователя (исправлено)
 */
export function getCurrentUser() {
  const user = restoreSession();
  return user && user.role ? user : null;
}

/**
 * Получение текущего токена (исправлено)
 */
export function getToken() {
  const user = getCurrentUser();
  return user?.token || user?.access_token || null;
}