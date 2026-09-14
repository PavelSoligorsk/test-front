import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { getHomeRoute, getUserRole } from '../../features/auth';
import StudentStatsContent from '../StudentStatsPage/StudentStatsContent';
import { fetchUserDetailedStats } from '../StudentDashboardPage/api';

export default function StatsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const role = getUserRole();

  const fetchStats = useCallback(
    (period) => fetchUserDetailedStats(userId, period, role),
    [userId, role]
  );

  if (!userId) {
    if (role === 'teacher') return <Navigate to="/teacher" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/student/stats" replace />;
  }

  if (role === 'student') {
    return <Navigate to="/student/stats" replace />;
  }

  if (role !== 'teacher' && role !== 'admin') {
    return <Navigate to={getHomeRoute(role)} replace />;
  }

  return (
    <StudentStatsContent
      fetchStats={fetchStats}
      onBack={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate(getHomeRoute(role));
      }}
      backLabel="Назад"
    />
  );
}
