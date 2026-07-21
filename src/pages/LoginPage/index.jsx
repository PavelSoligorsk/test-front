import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import { saveSession } from '../../shared/lib/session';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', form.username);
    params.append('password', form.password);
    params.append('scope', '');

    const res = await axios.post(`${API_URL}/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    saveSession(res.data); // Автоматически вызовет SESSION_EVENT

    // Редирект на сохранённый URL или на дашборд по роли
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/')) {
      return navigate(redirect, { replace: true });
    }

    const role = res.data?.role;
    if (role === 'student') navigate('/student', { replace: true });
    else if (role === 'teacher') navigate('/teacher', { replace: true });
    else if (role === 'admin') navigate('/admin', { replace: true });
    else navigate('/', { replace: true });

  } catch (err) {
    alert(err.response?.data?.detail || 'Ошибка входа');
  }
};

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 w-full max-w-md">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Вход</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Войдите в аккаунт</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input placeholder="Логин" required
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
            onChange={e => setForm({ ...form, username: e.target.value })} />
          <input type="password" placeholder="Пароль" required
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
            onChange={e => setForm({ ...form, password: e.target.value })} />
          <button type="submit"
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-200">
            Войти
          </button>
        </form>
        <div className="mt-6 text-center space-y-3">
          <button onClick={() => navigate('/register')} className="text-slate-500 text-xs font-bold hover:underline">Нет аккаунта? Зарегистрироваться</button>
          <div><button onClick={() => navigate('/reset-password')} className="text-slate-400 text-[10px] font-bold hover:underline">Забыли пароль?</button></div>
        </div>
      </div>
    </div>
  );
}
