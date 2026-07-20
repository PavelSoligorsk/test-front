/**
 * Единая конфигурация API URL.
 *
 * Автоопределение окружения:
 * - На Vercel (process.env.VERCEL или window.location.hostname не localhost) → продакшен
 * - Локально → http://localhost:8000
 *
 * Можно переопределить через переменную окружения VITE_API_URL
 */

const isVercel = typeof window !== 'undefined' && (
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
);

const PRODUCTION_URL = 'https://tests-production-46d5.up.railway.app';

export const API_URL = import.meta.env.VITE_API_URL || (isVercel ? PRODUCTION_URL : 'http://localhost:8000');
