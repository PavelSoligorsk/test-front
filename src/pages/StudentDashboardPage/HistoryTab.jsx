import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, LayoutGrid, ChevronRight, Inbox } from 'lucide-react';

export default function HistoryTab({ filteredHistory, searchTerm, setSearchTerm, onRetake }) {
  const navigate = useNavigate();

  // Отсекаем записи с некорректной/битой датой
  const validHistory = filteredHistory.filter(res => {
    const year = new Date(res.completed_at).getFullYear();
    return !Number.isNaN(year) && year >= 2000;
  });

  const cleanTitle = title => title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim();

  const formatDate = iso => new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Шапка */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
            <LayoutGrid size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              История решений
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {validHistory.length > 0
                ? `${validHistory.length} ${validHistory.length === 1 ? 'запись' : 'записей'}`
                : 'Пока без результатов'}
            </p>
          </div>
        </div>

        {/* Поиск (в стиле Spotlight / Command Palette) */}
        <div className="relative w-full md:w-72 group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" />
          <input
            type="text"
            placeholder="Поиск по истории..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 transition-all"
          />
        </div>
      </div>

      {/* Список */}
      {validHistory.length > 0 ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {validHistory.map(res => {
            const title = cleanTitle(res.test_title);
            return (
              <li
                key={res.id}
                onClick={() => navigate(`/result/${res.id}`)}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/result/${res.id}`); }}
                tabIndex={0}
                role="button"
                aria-label={`Открыть результат теста ${title ?? ''}`}
                className="group flex items-center gap-4 md:gap-6 px-6 md:px-8 py-4 md:py-5 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/40 focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40"
              >
                <time
                  dateTime={res.completed_at}
                  className="hidden sm:block shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap"
                >
                  {formatDate(res.completed_at)}
                </time>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                    {title}
                  </p>
                  <time
                    dateTime={res.completed_at}
                    className="sm:hidden block text-xs text-zinc-500 mt-1.5 tabular-nums whitespace-nowrap"
                  >
                    {formatDate(res.completed_at)}
                  </time>
                </div>

                {/* Баллы */}
                <div className="flex flex-col items-end shrink-0 px-2">
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight tabular-nums">
                    {res.total_points}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    баллов
                  </span>
                </div>

                {/* Действия (Пересдать + Стрелка) */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetake(res.id, res.test_id); }}
                    className="opacity-100 md:opacity-0 md:-translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900 dark:focus-visible:ring-white shadow-sm"
                    title="Пересдать тест"
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    <span className="hidden sm:inline">Пересдать</span>
                  </button>
                  <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors" />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        /* Пустое состояние */
        <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
            <Inbox size={24} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">История пуста</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
              Ваши результаты появятся здесь сразу после прохождения первого теста.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}