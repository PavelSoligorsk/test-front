/**
 * Проверка, авторизован ли пользователь
 */
export function isAuthenticated() {
  try {
    const session = localStorage.getItem('edu_session') || sessionStorage.getItem('edu_session');
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Получение роли текущего пользователя
 */
export function getUserRole() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return session?.role || null;
  } catch {
    return null;
  }
}

/**
 * Редирект в зависимости от роли
 */
export function getHomeRoute(role) {
  switch (role) {
    case 'admin': return '/admin';
    case 'teacher': return '/teacher';
    case 'student':
    default: return '/student';
  }
}
