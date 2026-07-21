import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { restoreSession, getCurrentUser } from '../../shared/lib/session';
import Navbar from '../../widgets/Navbar';

// Lazy load pages
const LoginPage = React.lazy(() => import('../../pages/LoginPage'));
const RegisterPage = React.lazy(() => import('../../pages/RegisterPage'));
const ResetPasswordPage = React.lazy(() => import('../../pages/ResetPasswordPage'));

const StudentDashboard = React.lazy(() => import('../../pages/StudentDashboardPage'));
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

// Инициализируем сессию для установки токена в axios headers
restoreSession();

function PrivateRoute({ children, allowedRoles }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
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

export default function AppRoutes() {
  return (
    <Router>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <Routes>
            {/* Публичные страницы */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Защищенные страницы */}
            <Route path="/student" element={
              <PrivateRoute allowedRoles={['student']}><StudentDashboard /></PrivateRoute>
            } />
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

            <Route path="/test/:testId" element={<TestPassing />} />
            <Route path="/result/:resultId" element={<TestResultDetail />} />

            <Route path="/stats" element={<StatsPage />} />
            <Route path="/stats/:userId" element={<StatsPage />} />
            <Route path="/stats/me" element={<StatsPage />} />

            <Route path="/" element={<HomePage />} />
          </Routes>
        </div>
      </React.Suspense>
    </Router>
  );
}