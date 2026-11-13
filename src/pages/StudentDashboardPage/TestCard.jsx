import { LayoutGrid, ArrowRight } from 'lucide-react';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white';

function tasksWord(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'задача';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'задачи';
  return 'задач';
}

export default function TestCard({ test, type, onStart, disabled }) {
  const fromTeacher = type === 'custom';
  const rawTitle =
    test.title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim() || 'Без названия';
  const sectionName = String(test.subject || test.target_topic || '').trim();
  const sectionInTitle = sectionName
    && rawTitle.toLowerCase().includes(sectionName.toLowerCase());
  const heading = sectionInTitle
    ? rawTitle.replace(new RegExp(sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ').replace(/\s+/g, ' ').trim()
    : rawTitle;
  const tasksCount = test.tasks_count ?? test.tasks?.length ?? 0;
  const actionLabel = disabled ? 'Недоступно' : test.started ? 'Продолжить' : 'Начать';

  const start = () => {
    if (!disabled) onStart?.(test);
  };

  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      start();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={start}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col h-full overflow-hidden rounded-xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800/60 shadow-sm transition-[background-color,border-color] motion-reduce:transition-none ${FOCUS_RING} ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-900/40'
      }`}
    >
      <div className="flex flex-col flex-1 gap-2 p-3">
        <h3 className="text-sm font-semibold leading-5 tracking-[-0.01em] text-zinc-900 dark:text-zinc-100 break-words">
          {heading || sectionName || 'Без названия'}
        </h3>
        {heading && sectionInTitle ? (
          <p className="text-sm font-semibold leading-5 tracking-[-0.01em] text-zinc-900 dark:text-zinc-100 break-words">
            {sectionName}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 min-h-5">
          <p className="inline-flex items-center gap-1 shrink-0 text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
            <LayoutGrid size={12} className="shrink-0 text-zinc-400" />
            {tasksCount} {tasksWord(tasksCount)}
          </p>
          {fromTeacher ? (
            <span className="shrink-0 text-[10px] leading-none font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-1 rounded-md">
              От учителя
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-2.5">
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {actionLabel}
            </span>
            {!disabled && (
              <ArrowRight size={13} className="text-zinc-300 dark:text-zinc-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
