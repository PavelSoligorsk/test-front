import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = 'https://tests-production-46d5.up.railway.app';

export default function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const loginData = new URLSearchParams();
    loginData.append('username', formData.username);
    loginData.append('password', formData.password);

    const res = await axios.post(`${API_URL}/login`, loginData, {
      withCredentials: true  // включаем куки
    });

    const userData = {
      username: res.data.username,
      role: res.data.role,
      token: res.data.access_token
    };

    // Способ 1: localStorage (для обычных браузеров)
    try {
      localStorage.setItem('edu_session', JSON.stringify(userData));
    } catch(e) { console.log('localStorage не доступен', e); }

    // Способ 2: sessionStorage (резерв)
    try {
      sessionStorage.setItem('edu_session', JSON.stringify(userData));
    } catch(e) {}

    // Способ 3: кука (самый надёжный на телефонах)
    document.cookie = `edu_session=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=604800; samesite=lax`;

    // Устанавливаем заголовок
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;

    // Редирект
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'teacher') navigate('/teacher');
    else navigate('/student');

  } catch (err) {
    setError(err.response?.data?.detail || 'Неверный логин или пароль');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">ВХОД</h1>
          <p className="text-slate-500 mt-2">Добро пожаловать в EDU.CORE</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Логин</label>
            <input 
              type="text" 
              required
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all"
              placeholder="Ваш username"
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Пароль</label>
            <input 
              type="password" 
              required
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all"
              placeholder="••••••••"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-lg 
              ${loading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-[0.98]'}`}
          >
            {loading ? 'ЗАГРУЗКА...' : 'ВОЙТИ В СИСТЕМУ'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-sm">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-blue-600 font-bold hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}