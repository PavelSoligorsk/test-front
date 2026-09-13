import { GraduationCap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../shared/ui';
import { clearSession } from '../../shared/lib/session';

export const STUDENT_TABS = [
  { key: 'theory', label: 'Теория' },
  { key: 'tests', label: 'Тесты' },
  { key: 'history', label: 'История' },
  { key: 'stats', label: 'Статистика' },
  { key: 'profile', label: 'Профиль' },
];

export default function StudentNav({ displayName, activeKey, onSelect }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/60 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 md:flex md:justify-between md:gap-4">
        <div className="col-start-1 row-start-1 flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">
            <GraduationCap size={16} strokeWidth={2} />
          </div>
          {displayName ? (
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[10rem] sm:max-w-none">
              {displayName}
            </span>
          ) : null}
        </div>

        <div className="col-span-3 row-start-2 min-w-0 w-full md:w-max md:ml-auto">
          <div className="grid grid-cols-5 w-full md:flex md:w-max items-center p-1 bg-zinc-100/80 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
            {STUDENT_TABS.map((tab) => {
              const isActive = activeKey === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelect(tab.key)}
                  className={`relative min-w-0 min-h-11 md:min-h-0 px-0.5 sm:px-3 md:px-4 py-1.5 rounded-lg text-[10px] min-[400px]:text-[11px] sm:text-xs md:text-sm font-medium transition-all duration-200 text-center leading-tight whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                    isActive
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200/50 dark:border-zinc-700/50" />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-start-3 row-start-1 flex items-center gap-0.5 justify-self-end shrink-0">
          <ThemeToggle className="min-h-11 min-w-11 md:min-h-0 md:min-w-0" />
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 inline-flex items-center justify-center p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
