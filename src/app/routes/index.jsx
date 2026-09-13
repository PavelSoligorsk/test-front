import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { restoreSession, getCurrentUser, SESSION_EVENT } from '../../shared/lib/session';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import Navbar from '../../widgets/Navbar';

// Lazy load pages
const LoginPage = React.lazy(() => import('../../pages/LoginPage'));
const RegisterPage = React.lazy(() => import('../../pages/RegisterPage'));
const ResetPasswordPage = React.lazy(() => import('../../pages/ResetPasswordPage'));

const StudentLayout = React.lazy(() => import('../../pages/StudentDashboardPage'));
const StudentTestsPage = React.lazy(() => import('../../pages/StudentDashboardPage/TestsPage'));
const StudentTheoryPage = React.lazy(() => import('../../pages/StudentDashboardPage/TheoryPage'));
const StudentHistoryPage = React.lazy(() => import('../../pages/StudentDashboardPage/HistoryPage'));
const StudentProfilePage = React.lazy(() => import('../../pages/StudentDashboardPage/ProfilePage'));
const StudentIndexRedirect = React.lazy(() => import('../../pages/StudentDashboardPage/StudentIndexRedirect'));
const StudentStatsPage = React.lazy(() => import('../../pages/StudentStatsPage'));
const TeacherDashboard = React.lazy(() => import('../../pages/TeacherDashboardPage'));
const AdminDashboard = React.lazy(() => import('../../pages/AdminDashboardPage'));
const TestPassing = React.lazy(() => import('../../pages/TestPassingPage'));
const TestResultDetail = React.lazy(() => import('../../pages/TestResultDetailPage'));
const AdminResultView = React.lazy(() => import('../../pages/AdminResultViewPage'));
const TeacherResultView = React.lazy(() => import('../../pages/TeacherResultViewPage'));
const TeacherStudentProfile = React.lazy(() => import('../../pages/TeacherStudentProfilePage'));
const StatsPage = React.lazy(() => import('../../pages/StatsPageDir'));
const UserProfile = React.lazy(() => import('../../pages/UserProfilePage'));
const HomePage = React.lazy(() => import('../../pages/HomePage'));
const NotFoundPage = React.lazy(() => import('../../pages/NotFoundPage'));

// Инициализируем сессию для установки токена в axios headers
restoreSession();

/**
 * Компонент для редиректа авторизованных пользователей
 * Используется для страниц входа/регистрации
 */
function RedirectIfAuth({ children }) {
  const user = getCurrentUser();
  if (user) {
    const roleRoutes = {
      student: '/student',
      teacher: '/teacher',
      admin: '/admin',
    };
    return <Navigate to={roleRoutes[user.role] || '/student'} replace />;
  }
  return children;
}

function PrivateRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const location = useLocation();

  // Реактивно следим за изменениями сессии
  useEffect(() => {
    const handleChange = () => setUser(getCurrentUser());
    window.addEventListener(SESSION_EVENT, handleChange);
    return () => window.removeEventListener(SESSION_EVENT, handleChange);
  }, []);

  // Проверка при смене маршрута
  useEffect(() => {
    setUser(getCurrentUser());
  }, [location.pathname]);

  if (!user) {
    // Сохраняем текущий URL, чтобы после логина вернуться
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRoutes = {
      student: '/student',
      teacher: '/teacher',
      admin: '/admin',
    };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return children;
}

function isStudentSurface(pathname) {
  return pathname.startsWith('/student')
    || pathname.startsWith('/test/')
    || pathname.startsWith('/result/');
}

function AppChrome({ children }) {
  const { pathname } = useLocation();
  const studentSurface = isStudentSurface(pathname);

  return (
    <div className={`min-h-screen ${studentSurface ? 'bg-[#fafafa] dark:bg-[#09090b]' : 'bg-slate-50 dark:bg-slate-900'}`}>
      {!studentSurface && <Navbar />}
      {children}
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Router>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#09090b]">
          <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
        </div>
      }>
        <ErrorBoundary>
          <AppChrome>
            <Routes>
            {/* Публичные страницы — редирект на дашборд если уже залогинен */}
            <Route path="/login" element={
              <RedirectIfAuth><LoginPage /></RedirectIfAuth>
            } />
            <Route path="/register" element={
              <RedirectIfAuth><RegisterPage /></RedirectIfAuth>
            } />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Защищенные страницы */}
            <Route path="/student" element={
              <PrivateRoute allowedRoles={['student']}><StudentLayout /></PrivateRoute>
            }>
              <Route index element={<StudentIndexRedirect />} />
              <Route path="tests" element={<StudentTestsPage />} />
              <Route path="theory" element={<StudentTheoryPage />} />
              <Route path="theory/:topic" element={<StudentTheoryPage />} />
              <Route path="theory/:topic/:section" element={<StudentTheoryPage />} />
              <Route path="history" element={<StudentHistoryPage />} />
              <Route path="stats" element={<StudentStatsPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
            </Route>
            <Route path="/teacher" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherDashboard /></PrivateRoute>
            } />
            <Route path="/teacher/students/:userId" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherStudentProfile /></PrivateRoute>
            } />
            <Route path="/teacher/results/:resultId" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherResultView /></PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>
            } />
            <Route path="/admin/results/:resultId" element={
              <PrivateRoute allowedRoles={['admin']}><AdminResultView mode="view" /></PrivateRoute>
            } />
            <Route path="/admin/users/:userId" element={
              <PrivateRoute allowedRoles={['admin', 'teacher']}><UserProfile /></PrivateRoute>
            } />

            {/* Тесты и результаты — тоже под защитой */}
            <Route path="/test/:testId" element={
              <PrivateRoute><TestPassing /></PrivateRoute>
            } />
            <Route path="/result/:resultId" element={
              <PrivateRoute><TestResultDetail /></PrivateRoute>
            } />

            {/* Статистика */}
            <Route path="/stats" element={
              <PrivateRoute><StatsPage /></PrivateRoute>
            } />
            <Route path="/stats/:userId" element={
              <PrivateRoute><StatsPage /></PrivateRoute>
            } />
            {/* /stats/me убран — он будет обрабатываться через /stats/:userId с userId="me" */}

            {/* Главная и 404 */}
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </AppChrome>
        </ErrorBoundary>
      </React.Suspense>
    </Router>
  );
}