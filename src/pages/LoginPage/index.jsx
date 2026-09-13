import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import { saveSession } from '../../shared/lib/session';
import AuthShell, { AuthPasswordField, authButton, authField, authLabel, authLink } from '../../shared/ui/AuthShell';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', form.username);
      params.append('password', form.password);
      params.append('scope', '');

      const res = await axios.post(`${API_URL}/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      saveSession(res.data);

      const role = res.data?.role;
      if (role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }

      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        navigate(redirect, { replace: true });
        return;
      }

      if (role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else if (role === 'student') {
        navigate('/student', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Вход"
      hint="Войдите в аккаунт"
      footer={(
        <>
          <button type="button" onClick={() => navigate('/register')} className={authLink}>
            Нет аккаунта? Зарегистрироваться
          </button>
          <div>
            <button type="button" onClick={() => navigate('/reset-password')} className={authLink}>
              Забыли пароль?
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
        <div className="space-y-1.5">
          <label htmlFor="login-username" className={authLabel}>Логин</label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            required
            className={authField}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <AuthPasswordField
          id="login-password"
          name="password"
          label="Пароль"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </AuthShell>
  );
}
