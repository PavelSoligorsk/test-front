import { Navigate, useLocation } from 'react-router-dom';
import { restoreSession } from '../../shared/lib/session';

export default function HomePage() {
  const location = useLocation();
  console.log('[HomePage] location:', location.pathname);
  const savedUser = restoreSession();

  if (!savedUser) {
    console.log('[HomePage] no user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  switch (savedUser.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'teacher':
      return <Navigate to="/teacher" replace />;
    case 'student':
    default:
      return <Navigate to="/student" replace />;
  }
}
