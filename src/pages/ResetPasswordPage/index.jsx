import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../../shared/config';
import AuthShell, { AuthPasswordField, authButton, authField, authLabel, authLink } from '../../shared/ui/AuthShell';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      setMessage('Ссылка для сброса пароля отправлена на почту.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось отправить ссылку');
    } finally {
      setLoading(false);
    }
  };

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
    setMessage('');
    try {
      await axios.post(`${API_URL}/reset-password`, {
        token,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });
      setMessage('Пароль изменён. Сейчас откроется вход.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось сбросить пароль');
    } finally {
      setLoading(false);
    }
  };

  const notice = (
    <>
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p> : null}
    </>
  );

  const back = (
    <button type="button" onClick={() => navigate('/login')} className={authLink}>
      Вернуться ко входу
    </button>
  );

  if (token) {
    return (
      <AuthShell title="Новый пароль" hint="Придумайте новый пароль" footer={back}>
        <form onSubmit={handleReset} className="space-y-4">
          {notice}
          <AuthPasswordField
            id="reset-new"
            name="new-password"
            label="Новый пароль"
            autoComplete="new-password"
            required
            placeholder="Минимум 8 символов"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          />
          <AuthPasswordField
            id="reset-confirm"
            name="confirm-password"
            label="Подтвердите пароль"
            autoComplete="new-password"
            required
            placeholder="Повторите пароль"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
          <button type="submit" disabled={loading} className={authButton}>
            {loading ? 'Сохраняем…' : 'Сохранить пароль'}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Восстановление" hint="Введите email, привязанный к аккаунту" footer={back}>
      <form onSubmit={handleSendEmail} className="space-y-4">
        {notice}
        <div className="space-y-1.5">
          <label htmlFor="reset-email" className={authLabel}>Email</label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            className={authField}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Отправляем…' : 'Отправить ссылку'}
        </button>
      </form>
    </AuthShell>
  );
}
