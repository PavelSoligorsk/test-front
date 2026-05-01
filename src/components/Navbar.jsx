import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, GraduationCap, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('edu_session'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('edu_session');
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { icon: Shield, color: 'bg-purple-100 text-purple-600', label: 'Администратор' },
      teacher: { icon: GraduationCap, color: 'bg-blue-100 text-blue-600', label: 'Учитель' },
      student: { icon: User, color: 'bg-emerald-100 text-emerald-600', label: 'Студент' },
    };
    return badges[role] || badges.student;
  };

  const badge = user ? getRoleBadge(user.role) : null;
  const RoleIcon = badge?.icon;

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Логотип */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-sm sm:text-base italic">E</span>
            </div>
            <span className="text-lg sm:text-xl font-black text-slate-900 italic tracking-tight">
              EDU<span className="text-blue-600">.CORE</span>
            </span>
          </Link>
          
          {/* Десктопная версия */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl">
                  <div className="w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center">
                    <User size={14} className="text-slate-500" />
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-sm font-bold text-slate-800">{user.username}</div>
                    <div className={`text-[9px] font-black uppercase ${badge?.color}`}>
                      {badge?.label}
                    </div>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all font-bold text-sm"
                  >
                    <Shield size={14} />
                    Админ-панель
                  </Link>
                )}

                <button 
                  onClick={logout} 
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
                >
                  <LogOut size={14} />
                  Выйти
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="px-5 py-2.5 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Вход
                </Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Мобильная кнопка */}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            className="md:hidden p-2 rounded-xl hover:bg-slate-50 transition-all"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Мобильное меню */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {user ? (
              <>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                    <User size={18} className="text-slate-500" />
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-sm font-bold text-slate-800">{user.username}</div>
                    <div className={`text-[9px] font-black uppercase ${badge?.color}`}>
                      {badge?.label}
                    </div>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-purple-50 text-purple-600 font-bold text-sm"
                  >
                    <Shield size={16} />
                    Админ-панель
                  </Link>
                )}

                <button 
                  onClick={() => { logout(); setMobileOpen(false); }} 
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 font-bold text-sm w-full"
                >
                  <LogOut size={16} />
                  Выйти
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link 
                  to="/login" 
                  onClick={() => setMobileOpen(false)}
                  className="px-5 py-3 rounded-2xl font-bold text-sm text-center text-slate-600 bg-slate-50"
                >
                  Вход
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setMobileOpen(false)}
                  className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm text-center shadow-lg shadow-blue-200"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}