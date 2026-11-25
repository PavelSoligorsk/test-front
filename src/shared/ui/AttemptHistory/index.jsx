import { useMemo, useState } from 'react';
import { ChevronRight, Inbox, PenLine, Play, RotateCcw, SearchX } from 'lucide-react';
import { attemptDate, formatAttemptTime } from '../../lib/attemptTime';
import ListPage from '../ListPage';
import { Segmented } from '../SummaryCard';

const FILTERS = [
  { value: 'done', label: 'Сдано' },
  { value: 'open', label: 'Не сдано' },
  { value: 'all', label: 'Все' },
];

function cleanTitle(title) {
  return title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim() || 'Без названия';
}

function normalize(item) {
  const result = item.result || item;
  const completedAt = result.completed_at ?? item.completed_at ?? null;
  const startedAt = result.started_at ?? item.started_at ?? null;
  const finished = Boolean(result.is_completed) || Boolean(completedAt);
  return {
    id: result.id || item.result_id || item.id,
    testId: item.test_id || result.test_id || item.test?.id,
    title: cleanTitle(item.test_title || result.test_title),
    points: result.total_points ?? item.score,
    completedAt,
    startedAt,
    finished,
    spent: result.time_spent_seconds,
  };
}

function formatSpent(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return '';
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes} мин ${rest} с` : `${rest} с`;
}

function sortTime(row) {
  return attemptDate(row.finished ? row.completedAt : row.startedAt)?.getTime() || 0;
}

function timeText(iso) {
  const date = attemptDate(iso);
  if (!date) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return [
    formatAttemptTime(iso),
    date.getFullYear(),
    date.getDate(),
    pad(date.getDate()),
    date.getMonth() + 1,
    pad(date.getMonth() + 1),
    date.getHours(),
    pad(date.getHours()),
    date.getMinutes(),
    pad(date.getMinutes()),
  ].join(' ');
}

function matchesQuery(row, query) {
  if (!query) return true;
  if (row.title.toLowerCase().includes(query)) return true;
  return `${timeText(row.startedAt)} ${timeText(row.completedAt)}`.toLowerCase().includes(query);
}

/**
 * История попыток. Ученик передаёт onContinue, onRetake и onMistakes.
 * Учитель и админ — только onOpen: чужую попытку нельзя пересдать.
 */
export default function AttemptHistory({
  items = [],
  tone = 'page',
  onOpen,
  onContinue,
  onRetake,
  onMistakes,
  showSpent = false,
}) {
  const [status, setStatus] = useState('done');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .map(normalize)
      .filter((row) => {
        if (row.finished) {
          const year = row.completedAt ? new Date(row.completedAt).getFullYear() : NaN;
          if (!Number.isNaN(year) && year < 2000) return false;
        }
        if (!matchesQuery(row, query)) return false;
        if (status === 'open') return !row.finished;
        if (status === 'done') return row.finished;
        return true;
      })
      .sort((a, b) => sortTime(b) - sortTime(a));
  }, [items, search, status]);

  const empty = search
    ? { icon: <SearchX size={24} strokeWidth={1.5} />, title: 'Ничего не найдено', hint: 'Попробуйте другое слово' }
    : status === 'open'
      ? { icon: <Inbox size={24} strokeWidth={1.5} />, title: 'Нет незаконченных', hint: 'Все начатые тесты уже сданы.' }
      : status === 'done'
        ? { icon: <Inbox size={24} strokeWidth={1.5} />, title: 'Нет сданных', hint: 'Сданные попытки появятся здесь.' }
        : { icon: <Inbox size={24} strokeWidth={1.5} />, title: 'История пуста', hint: 'Результаты появятся после первого теста.' };

  return (
    <ListPage
      tone={tone}
      title="История решений"
      hint={rows.length > 0 ? `${rows.length} ${rows.length === 1 ? 'запись' : 'записей'}` : 'Пока без результатов'}
      extra={<Segmented options={FILTERS} value={status} onChange={setStatus} />}
      search={{ value: search, onChange: setSearch, placeholder: 'Название или время...' }}
      rows={rows}
      rowKey={(row) => row.id}
      empty={empty}
      getRowProps={(row) => {
        const open = () => ((!row.finished && onContinue) ? onContinue(row) : onOpen?.(row));
        return {
          onClick: open,
          onKeyDown: (event) => { if (event.key === 'Enter') open(); },
          tabIndex: 0,
          role: 'button',
          'aria-label': row.finished ? `Открыть результат ${row.title}` : `Доделать ${row.title}`,
          className: 'group flex cursor-pointer items-center gap-4 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-50 dark:hover:bg-zinc-900/40 md:gap-6',
        };
      }}
      renderRow={(row) => {
        const when = row.finished ? row.completedAt : row.startedAt;
        const spent = showSpent ? formatSpent(row.spent) : '';
        return (
          <>
            <time
              dateTime={when || undefined}
              className="hidden shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400 sm:block"
            >
              {formatAttemptTime(when)}
            </time>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-200">{row.title}</p>
              <p className="mt-1.5 text-xs tabular-nums text-zinc-500 sm:hidden">
                {formatAttemptTime(when)}{spent ? ` · ${spent}` : ''}
              </p>
              {spent ? <p className="mt-1 hidden text-xs text-zinc-400 sm:block">{spent}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end px-1 sm:px-2">
              <span className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {row.finished ? (row.points ?? '—') : '—'}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {row.finished ? 'баллов' : 'не сдано'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {row.finished && onMistakes ? (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onMistakes(row); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  title="Работа над ошибками"
                >
                  <PenLine size={14} strokeWidth={2} />
                  <span className="hidden sm:inline">Ошибки</span>
                </button>
              ) : null}
              {(row.finished ? onRetake : onContinue) ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (row.finished) onRetake(row);
                    else onContinue(row);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 sm:px-3.5"
                  title={row.finished ? 'Пересдать тест' : 'Доделать тест'}
                >
                  {row.finished ? <RotateCcw size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
                  <span className="hidden sm:inline">{row.finished ? 'Пересдать' : 'Доделать'}</span>
                </button>
              ) : null}
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
            </div>
          </>
        );
      }}
    />
  );
}
