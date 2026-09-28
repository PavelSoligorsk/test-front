import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUpdated } from '../../features/board/model';
import { boardErrorMessage, listStudentBoards } from '../../features/board/api';
import { boardPath } from './studentPaths';

function objectCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} объекта`;
  return `${count} объектов`;
}

export default function BoardListPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listStudentBoards()
      .then((rows) => setBoards(rows))
      .catch((err) => {
        setBoards([]);
        setError(boardErrorMessage(err, 'Не удалось загрузить доски'));
      });
  }, []);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Доска</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Доски, которые вам открыл учитель. Холст общий: ваши правки и правки учителя пишутся в один документ.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {boards == null ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Пока нет досок</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Учитель создаёт доску и назначает вас или вашу группу.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => navigate(boardPath(board.id))}
              className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{board.title || 'Доска'}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatUpdated(board.updatedAt)}
                  {' · '}
                  {objectCountLabel(board.objectCount ?? 0)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-200">Открыть</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
