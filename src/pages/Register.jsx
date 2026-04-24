import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({
    username: '', password: '', first_name: '', last_name: '', phone: '', tg_username: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://tests-production-46d5.up.railway.app/register', form);
      alert('Успех!');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-lg border">
      <h2 className="text-2xl font-black mb-6">Регистрация</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Имя" required className="p-3 border rounded-xl" onChange={e => setForm({...form, first_name: e.target.value})} />
          <input placeholder="Фамилия" required className="p-3 border rounded-xl" onChange={e => setForm({...form, last_name: e.target.value})} />
        </div>
        <input placeholder="Логин" required className="w-full p-3 border rounded-xl" onChange={e => setForm({...form, username: e.target.value})} />
        <input type="password" placeholder="Пароль" required className="w-full p-3 border rounded-xl" onChange={e => setForm({...form, password: e.target.value})} />
        <input placeholder="Телефон" className="w-full p-3 border rounded-xl" onChange={e => setForm({...form, phone: e.target.value})} />
        <input placeholder="Telegram @username" className="w-full p-3 border rounded-xl" onChange={e => setForm({...form, tg_username: e.target.value})} />
        <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">СОЗДАТЬ АККАУНТ</button>
      </form>
    </div>
  );
}