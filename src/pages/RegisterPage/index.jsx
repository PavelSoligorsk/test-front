import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../shared/config';
import AuthShell, { AuthPasswordField, authButton, authField, authLabel, authLink } from '../../shared/ui/AuthShell';

export default function Register() {
  const [form, setForm] = useState({
    username: '', password: '', first_name: '', last_name: '', phone: '', tg_username: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/register`, form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthShell
      title="Регистрация"
      hint="Создайте аккаунт, чтобы решать тесты"
      footer={(
        <button type="button" onClick={() => navigate('/login')} className={authLink}>
          Уже есть аккаунт? Войти
        </button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reg-first" className={authLabel}>Имя</label>
            <input id="reg-first" required autoComplete="given-name" className={authField} value={form.first_name} onChange={set('first_name')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-last" className={authLabel}>Фамилия</label>
            <input id="reg-last" required autoComplete="family-name" className={authField} value={form.last_name} onChange={set('last_name')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-username" className={authLabel}>Логин</label>
          <input id="reg-username" name="username" required autoComplete="username" className={authField} value={form.username} onChange={set('username')} />
        </div>
        <AuthPasswordField
          id="reg-password"
          name="password"
          label="Пароль"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set('password')}
        />
        <div className="space-y-1.5">
          <label htmlFor="reg-phone" className={authLabel}>Телефон</label>
          <input id="reg-phone" type="tel" autoComplete="tel" placeholder="+375…" className={authField} value={form.phone} onChange={set('phone')} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-tg" className={authLabel}>Telegram</label>
          <input id="reg-tg" placeholder="@username" className={authField} value={form.tg_username} onChange={set('tg_username')} />
        </div>
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
    </AuthShell>
  );
}
