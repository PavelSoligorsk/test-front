import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../../shared/config';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Шаг 1: отправка email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      setMessage('Ссылка для сброса пароля отправлена на вашу почту!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при отправке');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: установка нового пароля
  const handleReset = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('Пароль должен быть минимум 8 символов');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/reset-password`, {
        token: token,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword
      });
      setMessage('Пароль успешно изменен!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: форма нового пароля (если есть токен)
  if (token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">НОВЫЙ ПАРОЛЬ</h1>
            <p className="text-slate-500 mt-2">Придумайте новый пароль</p>
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm font-bold border border-green-100">{message}</div>
          )}
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Новый пароль</label>
              <input type="password" required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all"
                placeholder="Минимум 8 символов"
                onChange={e => setFormData({...formData, newPassword: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Подтвердите пароль</label>
              <input type="password" required
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all"
                placeholder="Повторите пароль"
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
            <button type="submit" disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-lg ${
                loading ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700 shadow-green-200 active:scale-[0.98]'
              }`}>
              {loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ПАРОЛЬ'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => navigate('/login')} className="text-slate-500 text-sm font-bold hover:underline">← Вернуться ко входу</button>
          </div>
        </div>
      </div>
    );
  }

  // Шаг 1: форма ввода email
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">ВОССТАНОВЛЕНИЕ</h1>
          <p className="text-slate-500 mt-2">Введите email, привязанный к аккаунту</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">{error}</div>
        )}
        {message && (
          <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm font-bold border border-green-100">{message}</div>
        )}
        <form onSubmit={handleSendEmail} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email</label>
            <input type="email" required
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all"
              placeholder="example@mail.com"
              value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-lg ${
              loading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-[0.98]'
            }`}>
            {loading ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ССЫЛКУ'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => navigate('/login')} className="text-slate-500 text-sm font-bold hover:underline">← Вернуться ко входу</button>
        </div>
      </div>
    </div>
  );
}
