import { useNavigate } from 'react-router-dom';
import { RotateCcw, ChevronRight, Inbox } from 'lucide-react';
import { HeadingBlock } from '../../shared/ui/HeadingBlock';
import { Sheet } from '../../shared/ui/Sheet';
import SearchField from '../../shared/ui/SearchField';
import EmptyState from '../../shared/ui/EmptyState';

export default function HistoryTab({ filteredHistory, searchTerm, setSearchTerm, onRetake }) {
  const navigate = useNavigate();

  const validHistory = filteredHistory.filter((res) => {
    const year = new Date(res.completed_at).getFullYear();
    return !Number.isNaN(year) && year >= 2000;
  });

  const cleanTitle = (title) => title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim();

  const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <Sheet className="overflow-hidden animate-in fade-in duration-500">
      <div className="p-5 sm:p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <HeadingBlock
          title="История решений"
          titleAs="h2"
          hint={validHistory.length > 0
            ? `${validHistory.length} ${validHistory.length === 1 ? 'запись' : 'записей'}`
            : 'Пока без результатов'}
          extra={(
            <SearchField
              className="w-full sm:w-72"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Поиск по истории..."
            />
          )}
        />
      </div>

      {validHistory.length > 0 ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {validHistory.map((res) => {
            const title = cleanTitle(res.test_title);
            return (
              <li
                key={res.id}
                onClick={() => navigate(`/result/${res.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/result/${res.id}`); }}
                tabIndex={0}
                role="button"
                aria-label={`Открыть результат теста ${title ?? ''}`}
                className="group flex items-center gap-4 md:gap-6 px-5 sm:px-6 md:px-8 py-4 md:py-5 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40 focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40"
              >
                <time
                  dateTime={res.completed_at}
                  className="hidden sm:block shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap"
                >
                  {formatDate(res.completed_at)}
                </time>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-200 truncate">
                    {title}
                  </p>
                  <time
                    dateTime={res.completed_at}
                    className="sm:hidden block text-xs text-zinc-500 mt-1.5 tabular-nums whitespace-nowrap"
                  >
                    {formatDate(res.completed_at)}
                  </time>
                </div>

                <div className="flex flex-col items-end shrink-0 px-1 sm:px-2">
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight tabular-nums">
                    {res.total_points}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    баллов
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRetake(res.id, res.test_id); }}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
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
        <EmptyState
          framed={false}
          className="py-16"
          icon={<Inbox size={24} strokeWidth={1.5} />}
          title="История пуста"
          hint="Результаты появятся после первого теста."
        />
      )}
    </Sheet>
  );
}
