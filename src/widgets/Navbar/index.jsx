import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, GraduationCap, Menu, X, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../../shared/hooks';
import { clearSession, getCurrentUser, SESSION_EVENT } from '../../shared/lib/session';

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const handleSessionChange = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener(SESSION_EVENT, handleSessionChange);
    return () => window.removeEventListener(SESSION_EVENT, handleSessionChange);
  }, []);

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { 
        icon: Shield, 
        color: 'text-purple-600 dark:text-purple-400', 
        bg: 'bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
        label: 'Администратор' 
      },
      teacher: { 
        icon: GraduationCap, 
        color: 'text-indigo-600 dark:text-indigo-400', 
        bg: 'bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
        label: 'Учитель' 
      },
      student: { 
        icon: User, 
        color: 'text-zinc-500 dark:text-zinc-400', 
        bg: 'bg-zinc-200/60 dark:bg-zinc-800/60 border-zinc-300/50 dark:border-zinc-700/50',
        label: null 
      },
    };
    return badges[role] || badges.student;
  };

  const badge = user ? getRoleBadge(user.role) : null;
  const RoleIcon = badge?.icon;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Логотип */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform shadow-sm shadow-indigo-500/20 shrink-0">
              <span className="text-white font-semibold text-lg">E</span>
            </div>
            <span className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              EDU<span className="text-indigo-600 dark:text-indigo-400">.CORE</span>
            </span>
          </Link>
          
          {/* Десктопное меню */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {/* Бейдж профиля */}
                <div className="flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/80 shadow-sm transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${badge?.bg}`}>
                    <RoleIcon size={14} className={badge?.color} />
                  </div>
                  <div className="flex flex-col justify-center leading-tight">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.username}</span>
                    {badge?.label && (
                      <span className={`text-[10px] font-medium tracking-wide ${badge?.color}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Разделитель */}
                <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>

                {/* Кнопка смены темы */}
                <button 
                  onClick={toggle} 
                  className="p-2.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" 
                  title={dark ? 'Светлая тема' : 'Тёмная тема'}
                >
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Админ-панель */}
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <Shield size={16} />
                    Админ-панель
                  </Link>
                )}

                {/* Выход */}
                <button 
                  onClick={logout} 
                  className="flex items-center justify-center p-2.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  title="Выйти"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggle} 
                  className="p-2.5 mr-1 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" 
                  title={dark ? 'Светлая тема' : 'Тёмная тема'}
                >
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Link 
                  to="/login" 
                  className="px-5 py-2 rounded-full font-medium text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Вход
                </Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-full font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Мобильная кнопка */}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            className="md:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Меню"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Мобильное меню */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileOpen ? 'max-h-96 opacity-100 border-t border-zinc-200 dark:border-zinc-800/80 py-4 pb-6' : 'max-h-0 opacity-0'
          }`}
        >
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/80 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${badge?.bg}`}>
                  <RoleIcon size={18} className={badge?.color} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.username}</span>
                  {badge?.label && (
                    <span className={`text-[11px] font-medium tracking-wide ${badge?.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </div>

              {user.role === 'admin' && (
                <Link 
                  to="/admin" 
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium text-sm transition-colors"
                >
                  <Shield size={18} />
                  Админ-панель
                </Link>
              )}

              <button 
                onClick={() => { toggle(); setMobileOpen(false); }} 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 font-medium text-sm w-full transition-colors"
              >
                {dark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600 dark:text-indigo-400" />}
                {dark ? 'Светлая тема' : 'Тёмная тема'}
              </button>

              <button 
                onClick={() => { logout(); setMobileOpen(false); }} 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium text-sm w-full transition-colors"
              >
                <LogOut size={18} />
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={() => { toggle(); setMobileOpen(false); }} 
                className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/50 font-medium text-sm w-full transition-colors"
              >
                {dark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600 dark:text-indigo-400" />}
                {dark ? 'Светлая тема' : 'Тёмная тема'}
              </button>
              <Link 
                to="/login" 
                onClick={() => setMobileOpen(false)}
                className="px-5 py-3 rounded-xl font-medium text-sm text-center text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                Вход
              </Link>
              <Link 
                to="/register" 
                onClick={() => setMobileOpen(false)}
                className="px-5 py-3 rounded-xl font-medium text-sm text-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 transition-colors shadow-sm"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}