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
import axios from 'axios';

// ========== ФУНКЦИЯ ДЛЯ НАДЁЖНОГО ВОССТАНОВЛЕНИЯ СЕССИИ ==========
function restoreSession() {
  let userData = null;
  
  // 1. Пробуем из localStorage
  const saved = localStorage.getItem('edu_session');
  if (saved) {
    try {
      userData = JSON.parse(saved);
      console.log('Сессия восстановлена из localStorage');
    } catch(e) {}
  }
  
  // 2. Если нет - пробуем из sessionStorage
  if (!userData) {
    const savedSession = sessionStorage.getItem('edu_session');
    if (savedSession) {
      try {
        userData = JSON.parse(savedSession);
        console.log('Сессия восстановлена из sessionStorage');
      } catch(e) {}
    }
  }
  
  // 3. Если есть токен - восстанавливаем заголовок
  if (userData?.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    // Дублируем в sessionStorage для надёжности на телефонах
    try {
      sessionStorage.setItem('edu_session', JSON.stringify(userData));
    } catch(e) {}
  }
  
  return userData;
}

// ========== СОХРАНЕНИЕ СЕССИИ (для использования в компонентах) ==========
export function saveSession(userData) {
  if (!userData) return;
  
  // Сохраняем везде, куда можем
  try {
    localStorage.setItem('edu_session', JSON.stringify(userData));
    sessionStorage.setItem('edu_session', JSON.stringify(userData));
    
    // Пробуем сохранить в куку (самый надёжный способ на телефонах)
    const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
    document.cookie = `edu_session=${encodeURIComponent(JSON.stringify(userData))}; expires=${expires}; path=/; samesite=lax`;
  } catch(e) {
    console.log('Не удалось сохранить сессию:', e);
  }
  
  axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
}

// ========== УДАЛЕНИЕ СЕССИИ (выход) ==========
export function clearSession() {
  try {
    localStorage.removeItem('edu_session');
    sessionStorage.removeItem('edu_session');
    document.cookie = 'edu_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  } catch(e) {}
  delete axios.defaults.headers.common['Authorization'];
}

// ========== ВОССТАНАВЛИВАЕМ СЕССИЮ ПРИ ЗАГРУЗКЕ ==========
const restoredUser = restoreSession();

const PrivateRoute = ({ children, allowedRoles }) => {
  // Проверяем сессию каждый раз, а не только при загрузке
  let savedUser = null;
  try {
    // Сначала из localStorage
    savedUser = JSON.parse(localStorage.getItem('edu_session'));
    if (!savedUser) {
      // Потом из sessionStorage
      savedUser = JSON.parse(sessionStorage.getItem('edu_session'));
    }
  } catch(e) {}
  
  if (!savedUser) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(savedUser.role)) {
    return <Navigate to="/login" replace />; 
  }
  
  return children;
};

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

          <Route path="/admin/users/:userId" element={
            <PrivateRoute allowedRoles={['admin', 'teacher']}>
              <UserProfile />
            </PrivateRoute>
          } />

          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </div>
    </Router>
  );
}

function HomeRedirect() {
  let savedUser = null;
  try {
    savedUser = JSON.parse(localStorage.getItem('edu_session'));
    if (!savedUser) {
      savedUser = JSON.parse(sessionStorage.getItem('edu_session'));
    }
  } catch(e) {}
  
  if (!savedUser) return <Navigate to="/login" />;
  if (savedUser.role === 'admin') return <Navigate to="/admin" />;
  if (savedUser.role === 'teacher') return <Navigate to="/teacher" />;
  return <Navigate to="/student" />;
}