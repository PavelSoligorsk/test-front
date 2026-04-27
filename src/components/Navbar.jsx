import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('edu_session'));

  const logout = () => {
    localStorage.removeItem('edu_session');
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
      <Link to="/" className="text-xl font-black text-blue-600">EDU.CORE</Link>
      
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <span className="text-sm font-bold text-slate-600 italic">{user.username}</span>
            {user.role === 'admin' && <Link to="/admin" className="text-sm font-bold">Админ</Link>}
            <button onClick={logout} className="text-red-500 font-bold text-sm">Выйти</button>
          </>
        ) : (
          <div className="flex gap-4">
            <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Вход</Link>
            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Регистрация</Link>
          </div>
        )}
      </div>
    </nav>
  );
}