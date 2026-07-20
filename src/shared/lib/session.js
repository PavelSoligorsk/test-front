import axios from 'axios';


const STORAGE_KEY = 'edu_session';

function getStorage() {
  // В SSR окружении localStorage может быть недоступен
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

/**
 * Надёжное восстановление сессии из всех доступных источников
 */
export function restoreSession() {
  let userData = null;

  // 1. Пробуем из localStorage
  const ls = getStorage();
  if (ls) {
    const saved = ls.getItem(STORAGE_KEY);
    if (saved) {
      try {
        userData = JSON.parse(saved);
      } catch (e) {}
    }
  }

  // 2. Если нет — пробуем из sessionStorage
  if (!userData) {
    const ss = getSessionStorage();
    if (ss) {
      const saved = ss.getItem(STORAGE_KEY);
      if (saved) {
        try {
          userData = JSON.parse(saved);
        } catch (e) {}
      }
    }
  }

  // 3. Если есть токен — восстанавливаем заголовок
  if (userData?.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    // Дублируем в sessionStorage для надёжности на телефонах
    try {
      getSessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {}
  }

  return userData;
}

/**
 * Сохранение сессии во все доступные хранилища
 */
export function saveSession(userData) {
  if (!userData) return;

  const data = JSON.stringify(userData);

  try {
    getStorage()?.setItem(STORAGE_KEY, data);
    getSessionStorage()?.setItem(STORAGE_KEY, data);

    // Пробуем сохранить в куку (самый надёжный способ на телефонах)
    const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(data)}; expires=${expires}; path=/; samesite=lax`;
  } catch (e) {
    console.log('Не удалось сохранить сессию:', e);
  }

  axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
}

/**
 * Удаление сессии (выход)
 */
export function clearSession() {
  try {
    getStorage()?.removeItem(STORAGE_KEY);
    getSessionStorage()?.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {}

  delete axios.defaults.headers.common['Authorization'];
}

/**
 * Получение текущего токена
 */
export function getToken() {
  try {
    const session = JSON.parse(getStorage()?.getItem(STORAGE_KEY) || '{}');
    return session?.token || session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Получение данных текущего пользователя
 */
export function getCurrentUser() {
  try {
    return JSON.parse(getStorage()?.getItem(STORAGE_KEY) || '{}');
  } catch {
    return null;
  }
}
