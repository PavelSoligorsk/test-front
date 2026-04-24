import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import UserProfile from './pages/UserProfile'; 
import TestPassing from './pages/TestPassing';
import TestResultDetail from './pages/TestResultDetail';
import AdminResultView from './pages/AdminResultView';
import axios from 'axios'; // Добавь эту строку первой




const PrivateRoute = ({ children, allowedRoles }) => {
  const savedUser = JSON.parse(localStorage.getItem('edu_session'));
  
  if (!savedUser) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(savedUser.role)) {
    // Вместо "/" отправляем туда, где нет редиректа обратно, 
    // либо на страницу профиля, которая доступна всем.
    return <Navigate to="/login" replace />; 
  }
  
  return children;
};

// Проверяем сессию при каждой загрузке страницы
const session = localStorage.getItem('edu_session');
if (session) {
  const { token } = JSON.parse(session);
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <Routes>
          {/* Публичные страницы */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          

          {/* Защищенные страницы */}
          <Route path="/student" element={
            <PrivateRoute allowedRoles={['student']}><StudentDashboard /></PrivateRoute>
          } />

          <Route path="/test/:testId" element={<TestPassing />} />
          
          <Route path="/teacher" element={
            <PrivateRoute allowedRoles={['teacher', 'admin']}><TeacherDashboard /></PrivateRoute>
          } />

<Route path="/admin/results/:resultId" element={<AdminResultView mode="view" />} />

          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>
          } />

          <Route path="/result/:resultId" element={<TestResultDetail />} />

          {/* НОВЫЙ РОУТ: Страница профиля пользователя */}
<Route path="/admin/users/:userId" element={
  <PrivateRoute allowedRoles={['admin', 'teacher']}>
    <UserProfile />
  </PrivateRoute>
} />

          {/* Редирект с главной в зависимости от роли */}
          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </div>
    </Router>
  );
}

// Умный редирект на главном пути
function HomeRedirect() {
  const savedUser = JSON.parse(localStorage.getItem('edu_session'));
  if (!savedUser) return <Navigate to="/login" />;
  if (savedUser.role === 'admin') return <Navigate to="/admin" />;
  if (savedUser.role === 'teacher') return <Navigate to="/teacher" />;
  return <Navigate to="/student" />;
}