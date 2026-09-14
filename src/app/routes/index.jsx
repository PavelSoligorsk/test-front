import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { restoreSession, getCurrentUser, SESSION_EVENT } from '../../shared/lib/session';
import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import Navbar from '../../widgets/Navbar';

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

const TeacherLayout = React.lazy(() => import('../../pages/TeacherDashboardPage/TeacherLayout.jsx'));
const TeacherIndexRedirect = React.lazy(() => import('../../pages/TeacherDashboardPage/TeacherIndexRedirect.jsx'));
const TeacherCalendarPage = React.lazy(() => import('../../pages/TeacherDashboardPage/CalendarPage.jsx'));
const TeacherBankPage = React.lazy(() => import('../../pages/TeacherDashboardPage/BankPage.jsx'));
const TeacherTopicsPage = React.lazy(() => import('../../pages/TeacherDashboardPage/TopicsPage.jsx'));
const TeacherConstructorPage = React.lazy(() => import('../../pages/TeacherDashboardPage/ConstructorPage.jsx'));
const TeacherStudentsPage = React.lazy(() => import('../../pages/TeacherDashboardPage/StudentsPage.jsx'));
const TeacherTestsPage = React.lazy(() => import('../../pages/TeacherDashboardPage/TestsPage.jsx'));
const TeacherGroupsPage = React.lazy(() => import('../../pages/TeacherDashboardPage/GroupsPage.jsx'));
const TeacherTheoryPage = React.lazy(() => import('../../pages/TeacherDashboardPage/TheoryPage.jsx'));
const TeacherProfilePage = React.lazy(() => import('../../pages/TeacherDashboardPage/ProfilePage.jsx'));

const AdminLayout = React.lazy(() => import('../../pages/AdminDashboardPage/AdminLayout.jsx'));
const AdminIndexRedirect = React.lazy(() => import('../../pages/AdminDashboardPage/AdminIndexRedirect.jsx'));
const AdminCreatePage = React.lazy(() => import('../../pages/AdminDashboardPage/CreatePage.jsx'));
const AdminBankPage = React.lazy(() => import('../../pages/AdminDashboardPage/BankPage.jsx'));
const AdminTheoryPage = React.lazy(() => import('../../pages/AdminDashboardPage/TheoryConstructorPage.jsx'));
const AdminLibraryPage = React.lazy(() => import('../../pages/AdminDashboardPage/LibraryPage.jsx'));
const AdminUsersPage = React.lazy(() => import('../../pages/AdminDashboardPage/UsersPage.jsx'));
const AdminBatchPage = React.lazy(() => import('../../pages/AdminDashboardPage/BatchPage.jsx'));
const AdminAccessPage = React.lazy(() => import('../../pages/AdminDashboardPage/AccessPage.jsx'));

const TestPassing = React.lazy(() => import('../../pages/TestPassingPage'));
const TestResultDetail = React.lazy(() => import('../../pages/TestResultDetailPage'));
const AdminResultView = React.lazy(() => import('../../pages/AdminResultViewPage'));
const TeacherResultView = React.lazy(() => import('../../pages/TeacherResultViewPage'));
const TeacherStudentProfile = React.lazy(() => import('../../pages/TeacherStudentProfilePage'));
const StatsPage = React.lazy(() => import('../../pages/StatsPageDir'));
const UserProfile = React.lazy(() => import('../../pages/UserProfilePage'));
const HomePage = React.lazy(() => import('../../pages/HomePage'));
const NotFoundPage = React.lazy(() => import('../../pages/NotFoundPage'));

restoreSession();

function RedirectIfAuth({ children }) {
  const user = getCurrentUser();
  if (user) {
    const roleRoutes = { student: '/student', teacher: '/teacher', admin: '/admin' };
    return <Navigate to={roleRoutes[user.role] || '/student'} replace />;
  }
  return children;
}

function PrivateRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const location = useLocation();

  useEffect(() => {
    const handleChange = () => setUser(getCurrentUser());
    window.addEventListener(SESSION_EVENT, handleChange);
    return () => window.removeEventListener(SESSION_EVENT, handleChange);
  }, []);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [location.pathname]);

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRoutes = { student: '/student', teacher: '/teacher', admin: '/admin' };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return children;
}

function isAuthSurface(pathname) {
  return pathname === '/login'
    || pathname === '/register'
    || pathname.startsWith('/reset-password');
}

function isZincSurface(pathname) {
  return pathname.startsWith('/student')
    || pathname.startsWith('/test/')
    || pathname.startsWith('/result/')
    || pathname.startsWith('/teacher')
    || pathname.startsWith('/admin')
    || isAuthSurface(pathname);
}

function AppChrome({ children }) {
  const { pathname } = useLocation();
  const zincSurface = isZincSurface(pathname);

  return (
    <div className={`min-h-screen ${zincSurface ? 'bg-[#fafafa] dark:bg-[#09090b]' : 'bg-slate-50 dark:bg-slate-900'}`}>
      {!zincSurface && <Navbar />}
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
              <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
              <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="/student" element={<PrivateRoute allowedRoles={['student']}><StudentLayout /></PrivateRoute>}>
                <Route index element={<StudentIndexRedirect />} />
                <Route path="tests" element={<StudentTestsPage />} />
                <Route path="theory" element={<StudentTheoryPage />} />
                <Route path="theory/:topic" element={<StudentTheoryPage />} />
                <Route path="theory/:topic/:section" element={<StudentTheoryPage />} />
                <Route path="history" element={<StudentHistoryPage />} />
                <Route path="stats" element={<StudentStatsPage />} />
                <Route path="profile" element={<StudentProfilePage />} />
              </Route>

              <Route path="/teacher" element={<PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherLayout /></PrivateRoute>}>
                <Route index element={<TeacherIndexRedirect />} />
                <Route path="calendar" element={<TeacherCalendarPage />} />
                <Route path="bank" element={<TeacherBankPage />} />
                <Route path="topics" element={<TeacherTopicsPage />} />
                <Route path="constructor" element={<TeacherConstructorPage />} />
                <Route path="students" element={<TeacherStudentsPage />} />
                <Route path="tests" element={<TeacherTestsPage />} />
                <Route path="groups" element={<TeacherGroupsPage />} />
                <Route path="theory" element={<TeacherTheoryPage />} />
                <Route path="profile" element={<TeacherProfilePage />} />
              </Route>
              <Route path="/teacher/students/:userId" element={<PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherStudentProfile /></PrivateRoute>} />
              <Route path="/teacher/results/:resultId" element={<PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherResultView /></PrivateRoute>} />

              <Route path="/admin" element={<PrivateRoute allowedRoles={['admin']}><AdminLayout /></PrivateRoute>}>
                <Route index element={<AdminIndexRedirect />} />
                <Route path="create" element={<AdminCreatePage />} />
                <Route path="bank" element={<AdminBankPage />} />
                <Route path="theory" element={<AdminTheoryPage />} />
                <Route path="library" element={<AdminLibraryPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="batch" element={<AdminBatchPage />} />
                <Route path="access" element={<AdminAccessPage />} />
              </Route>
              <Route path="/admin/results/:resultId" element={<PrivateRoute allowedRoles={['admin']}><AdminResultView mode="view" /></PrivateRoute>} />
              <Route path="/admin/users/:userId" element={<PrivateRoute allowedRoles={['admin', 'teacher']}><UserProfile /></PrivateRoute>} />

              <Route path="/test/:testId" element={<PrivateRoute><TestPassing /></PrivateRoute>} />
              <Route path="/result/:resultId" element={<PrivateRoute><TestResultDetail /></PrivateRoute>} />
              <Route path="/stats" element={<PrivateRoute><StatsPage /></PrivateRoute>} />
              <Route path="/stats/:userId" element={<PrivateRoute><StatsPage /></PrivateRoute>} />
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppChrome>
        </ErrorBoundary>
      </React.Suspense>
    </Router>
  );
}
