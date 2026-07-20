import { Navigate } from 'react-router-dom';
import { restoreSession } from '../../shared/lib/session';

export default function HomePage() {
  const savedUser = restoreSession();

  if (!savedUser) return <Navigate to="/login" replace />;

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
