import axios from 'axios';

const STORAGE_KEY = 'edu_session';
const TOKEN_KEY = 'edu_token';
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
 * Строка сессии из хранилища: localStorage, а если там нет или мусор — sessionStorage.
 * Строка сравнима по значению, поэтому годится снимком для useSyncExternalStore.
 */
export function readStoredSession() {
  for (const storage of [getStorage, getSessionStorage]) {
    try {
      const saved = storage()?.getItem(STORAGE_KEY);
      if (saved && JSON.parse(saved)) return saved;
    } catch {}
  }
  return null;
}

/** Пользователь из строки сессии (без роли сессия не считается). */
export function parseSession(saved) {
  if (!saved) return null;
  try {
    const userData = JSON.parse(saved);
    return userData && userData.role ? userData : null;
  } catch {
    return null;
  }
}

/** Подписка на смену сессии: в этой вкладке (SESSION_EVENT) и в соседних (storage). */
export function subscribeSession(onChange) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Надежное восстановление сессии из всех источников
 */
export function restoreSession() {
  const saved = readStoredSession();
  const userData = saved ? JSON.parse(saved) : null;

  // Заголовок axios — по найденному токену
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
    getStorage()?.removeItem(TOKEN_KEY);
    getSessionStorage()?.removeItem(STORAGE_KEY);
    getSessionStorage()?.removeItem(TOKEN_KEY);
    document.cookie = `${STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch {}

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