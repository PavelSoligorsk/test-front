import { GraduationCap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { clearSession } from '../../lib/session';

export default function RoleNav({
  tabs,
  activeKey,
  onSelect,
  displayName,
  subtitle,
  icon,
  onBrandClick,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const tabCount = tabs.length;
  const gridClass = tabCount <= 5
    ? 'grid grid-cols-5'
    : tabCount <= 7
      ? 'grid grid-cols-4 sm:grid-cols-7'
      : 'grid grid-cols-4 sm:grid-cols-8';

  const brandInner = (
    <>
      <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm shrink-0">
        {icon || <GraduationCap size={16} strokeWidth={2} />}
      </div>
      <div className="min-w-0 text-left">
        {displayName ? (
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight truncate max-w-[10rem] sm:max-w-none">
            {displayName}
          </span>
        ) : null}
        {subtitle ? (
          <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {subtitle}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/60 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 md:flex md:justify-between md:gap-4">
        <div className="col-start-1 row-start-1 flex items-center gap-3 min-w-0">
          {onBrandClick ? (
            <button
              type="button"
              onClick={onBrandClick}
              className="flex items-center gap-3 min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
            >
              {brandInner}
            </button>
          ) : (
            <div className="flex items-center gap-3 min-w-0">{brandInner}</div>
          )}
        </div>

        <div className="col-span-3 row-start-2 min-w-0 w-full md:w-max md:ml-auto overflow-x-auto scrollbar-none">
          <div className={`${gridClass} w-full md:flex md:w-max items-center p-1 bg-zinc-100/80 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60`}>
            {tabs.map((tab) => {
              const isActive = activeKey === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelect(tab.key)}
                  className={`relative min-w-0 min-h-11 md:min-h-0 px-0.5 sm:px-2 md:px-3 py-1.5 rounded-lg text-[10px] min-[400px]:text-[11px] sm:text-xs md:text-sm font-medium transition-all duration-200 text-center leading-tight whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
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

        <div className="col-start-3 row-start-1 flex items-center gap-1 justify-self-end shrink-0">
          <ThemeToggle className="min-h-11 min-w-11 md:min-h-0 md:min-w-0" />
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 md:min-h-0 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
