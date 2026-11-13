export function getUserRole() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return session?.role || null;
  } catch {
    return null;
  }
}

export function getHomeRoute(role) {
  switch (role) {
    case 'admin': return '/admin';
    case 'teacher': return '/teacher';
    case 'student':
    default: return '/student';
  }
}
