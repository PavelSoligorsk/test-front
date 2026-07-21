import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { restoreSession, getCurrentUser } from '../../shared/lib/session';
import Navbar from '../../widgets/Navbar';

// Вызываем один раз при загрузке скрипта для установки axios заголовка
restoreSession();

function PrivateRoute({ children, allowedRoles }) {
  const user = getCurrentUser();

  // 1. Не авторизован
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Авторизован, но нет доступа к роту -> редирект на свой дашборд
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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