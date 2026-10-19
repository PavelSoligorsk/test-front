import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardErrorMessage, listStudentBoards } from '../../features/board/api';
import BoardGallery from '../../features/board/BoardGallery';
import { boardCountLabel, groupBoardSeries } from '../../features/board/model';
import { boardPath } from './studentPaths';

export default function BoardListPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState('');
  const series = useMemo(() => groupBoardSeries(boards || []), [boards]);

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
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Мои доски</h1>
        <p className="mt-1 text-sm text-zinc-500">{boards ? boardCountLabel(series.length) : 'Загрузка'}</p>
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
        <BoardGallery boards={series} onOpen={(board) => navigate(boardPath(board.id))} />
      )}
    </main>
  );
}
