import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { restoreSession } from '../../shared/lib/session';
import Navbar from '../../widgets/Navbar';

// Lazy load pages
const Login = React.lazy(() => import('../../pages/LoginPage'));
const Register = React.lazy(() => import('../../pages/RegisterPage'));
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
const ResetPassword = React.lazy(() => import('../../pages/ResetPasswordPage'));
const HomePage = React.lazy(() => import('../../pages/HomePage'));

function PrivateRoute({ children, allowedRoles }) {
  let savedUser = null;
  try {
    savedUser = JSON.parse(localStorage.getItem('edu_session'));
    if (!savedUser) {
      savedUser = JSON.parse(sessionStorage.getItem('edu_session'));
    }
  } catch (e) {}

  if (!savedUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(savedUser.role)) {
    return <Navigate to="/login" replace />;
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/student" element={
              <PrivateRoute allowedRoles={['student']}><StudentDashboard /></PrivateRoute>
            } />
            <Route path="/teacher" element={
              <PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherDashboard /></PrivateRoute>
            } />
            <Route path="/teacher/students/:userId" element={<TeacherStudentProfile />} />
            <Route path="/teacher/results/:resultId" element={<TeacherResultView />} />
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>
            } />
            <Route path="/admin/results/:resultId" element={<AdminResultView mode="view" />} />
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
