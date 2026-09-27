import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { contentBounds } from '../../features/board/geometry';
import { formatUpdated, lessonTitle } from '../../features/board/model';
import {
  boardErrorMessage,
  createStudentBoard,
  deleteStudentBoard,
  getStudentBoard,
  listStudentBoards,
  putStudentBoard,
} from '../../features/board/api';
import { deleteBoard, listBoards, saveBoard } from '../../features/board/storage';
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
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listStudentBoards()
      .then((rows) => setBoards(rows || []))
      .catch(async () => {
        const local = await listBoards().catch(() => []);
        setBoards(local);
        setError('Сервер досок не ответил. Показаны холсты этого браузера.');
      });
  }, []);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const board = await createStudentBoard(lessonTitle());
      await saveBoard(board);
      navigate(boardPath(board.id));
    } catch (error) {
      setError(boardErrorMessage(error, 'Не удалось создать урок'));
      setCreating(false);
    }
  }

  async function handleRename(board) {
    const title = renameValue.trim();
    if (!title || title === board.title) {
      setRenamingId(null);
      return;
    }
    try {
      const full = board.objects ? board : await getStudentBoard(board.id);
      const saved = await putStudentBoard({ ...full, title });
      await saveBoard(saved);
      setBoards((prev) => prev.map((item) => (
        item.id === board.id
          ? { ...item, title: saved.title, updatedAt: saved.updatedAt, objectCount: saved.objects?.length ?? item.objectCount }
          : item
      )));
      setRenamingId(null);
    } catch (error) {
      setError(boardErrorMessage(error, 'Не удалось переименовать'));
      setRenamingId(null);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteStudentBoard(id);
      await deleteBoard(id).catch(() => {});
      setBoards((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (error) {
      setError(boardErrorMessage(error, 'Не удалось удалить'));
      setConfirmDeleteId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Доска</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Черновик пишется сразу на этом устройстве и сохраняется на сервер.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <Plus size={16} />
          Новый урок
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {boards == null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Пока нет уроков</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Новый урок открывает пустой холст: стикеры, фигуры, кисть и построение в GeoGebra.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
          >
            <Plus size={16} />
            Новый урок
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <article
              key={board.id}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                type="button"
                onClick={() => navigate(boardPath(board.id))}
                className="block w-full text-left"
              >
                <div className="h-36 border-b border-zinc-100 bg-[#f3f3f4] dark:border-zinc-800 dark:bg-[#141416]">
                  <BoardPreview objects={board.objects || []} />
                </div>
              </button>
              <div className="flex items-start gap-2 p-4">
                <div className="min-w-0 flex-1">
                  {renamingId === board.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleRename(board);
                      }}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => handleRename(board)}
                        className="w-full rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm font-semibold outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-200"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(boardPath(board.id))}
                      className="block max-w-full truncate text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      {board.title}
                    </button>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatUpdated(board.updatedAt)}
                    {board.kind === 'student' ? ' · тетрадь занятия' : board.kind === 'draft' ? ' · черновик' : ''}
                    {' · '}
                    {objectCountLabel(board.objectCount ?? (board.objects || []).length)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Переименовать"
                  onClick={() => {
                    setRenamingId(board.id);
                    setRenameValue(board.title);
                  }}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <Pencil size={14} />
                </button>
                {board.kind !== 'student' && (confirmDeleteId === board.id ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(board.id)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    Удалить
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Удалить урок"
                    onClick={() => setConfirmDeleteId(board.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={14} />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function BoardPreview({ objects }) {
  const bounds = contentBounds(objects.slice(0, 40));
  if (!bounds) {
    return <div className="h-full w-full bg-[radial-gradient(circle,rgba(113,113,122,0.45)_1px,transparent_1px)] bg-[size:16px_16px]" />;
  }
  return (
    <svg viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`} className="h-full w-full">
      {objects.slice(0, 40).map((obj) => {
        if (obj.type === 'draw') {
          return (
            <polyline
              key={obj.id}
              points={(obj.props.points || []).map((point) => `${obj.x + point.x},${obj.y + point.y}`).join(' ')}
              fill="none"
              stroke={obj.props.color || '#18181b'}
              strokeWidth={obj.props.width || 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        if (obj.type === 'arrow') {
          return (
            <line
              key={obj.id}
              x1={obj.x + obj.props.x1}
              y1={obj.y + obj.props.y1}
              x2={obj.x + obj.props.x2}
              y2={obj.y + obj.props.y2}
              stroke={obj.props.color || '#18181b'}
              strokeWidth={obj.props.width || 3}
            />
          );
        }
        if (obj.type === 'shape' && obj.props.shape === 'ellipse') {
          return (
            <ellipse
              key={obj.id}
              cx={obj.x + obj.w / 2}
              cy={obj.y + obj.h / 2}
              rx={obj.w / 2}
              ry={obj.h / 2}
              fill={obj.props.fill || '#fff'}
              stroke={obj.props.stroke || '#18181b'}
            />
          );
        }
        const fill = obj.type === 'sticky'
          ? (obj.props.color || '#fde68a')
          : obj.type === 'geogebra'
            ? '#dbeafe'
            : obj.type === 'image'
              ? '#f4f4f5'
              : obj.type === 'text'
                ? 'transparent'
                : (obj.props.fill || '#ffffff');
        return (
          <rect
            key={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.w}
            height={obj.h}
            rx={obj.type === 'geogebra' ? 12 : 8}
            fill={fill}
            stroke={obj.type === 'geogebra' ? '#2563eb' : (obj.props.stroke || '#18181b')}
            strokeWidth={obj.type === 'text' ? 0 : 2}
          />
        );
      })}
    </svg>
  );
}
