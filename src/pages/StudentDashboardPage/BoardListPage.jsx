import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardErrorMessage, listStudentBoards } from '../../features/board/api';
import BoardGallery from '../../features/board/BoardGallery';
import { boardCountLabel, groupBoardSeries } from '../../features/board/model';
import { boardPath } from './studentPaths';
import { PageShell } from '../../shared/ui/Sheet';
import EmptyState from '../../shared/ui/EmptyState';
import { Inbox, SearchX } from 'lucide-react';
import SearchField from '../../shared/ui/SearchField';

export default function BoardListPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const series = useMemo(() => groupBoardSeries(boards || []), [boards]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return series;
    return series.filter((board) => (board.title || 'Доска').toLowerCase().includes(needle));
  }, [series, query]);

  useEffect(() => {
    listStudentBoards()
      .then((rows) => setBoards(rows))
      .catch((err) => {
        setBoards([]);
        setError(boardErrorMessage(err, 'Не удалось загрузить доски'));
      });
  }, []);

  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">Мои доски</h1>
          <p className="mt-1 text-sm text-zinc-500">{boards ? boardCountLabel(visible.length) : 'Загрузка'}</p>
        </div>
        {boards && boards.length > 0 && (
          <SearchField
            className="w-full sm:w-72"
            value={query}
            onChange={setQuery}
            onClear={() => setQuery('')}
            placeholder="Поиск по слову..."
          />
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {boards == null ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={<Inbox size={24} strokeWidth={1.5} />}
          title="Пока нет досок"
          hint="Учитель создаёт доску и назначает вас или вашу группу."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.5} />}
          title="Ничего не найдено"
          hint="Попробуйте другое слово"
        />
      ) : (
        <BoardGallery boards={visible} onOpen={(board) => navigate(boardPath(board.id))} />
      )}
    </PageShell>
  );
}
