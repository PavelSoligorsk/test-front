import { useState, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('edu_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { authApi } = await import('../api');
      const userData = await authApi.login(username, password);
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Ошибка входа';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const { clearSession } = require('../../../shared/lib/session');
    clearSession();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
