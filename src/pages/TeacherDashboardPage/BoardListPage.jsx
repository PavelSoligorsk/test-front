import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import {
  boardErrorMessage,
  createTeacherBoard,
  deleteTeacherBoard,
  listTeacherBoards,
} from '../../features/board/api';
import { deleteBoard, saveBoard } from '../../features/board/storage';
import { formatUpdated } from '../../features/board/model';
import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';

function objectCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} объект`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} объекта`;
  return `${count} объектов`;
}

function personName(person) {
  const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
  return name || person.username || `ID ${person.id}`;
}

function audienceLabel(board, students, groups) {
  if (board.groupId != null) {
    const group = (groups || []).find((item) => String(item.id) === String(board.groupId));
    return group?.name || `Группа ${board.groupId}`;
  }
  const ids = board.studentIds || [];
  if (!ids.length) return 'Без учеников';
  const names = ids.map((id) => {
    const person = (students || []).find((item) => String(item.id) === String(id));
    return person ? personName(person) : null;
  }).filter(Boolean);
  if (!names.length) return ids.length === 1 ? '1 ученик' : `${ids.length} учеников`;
  if (names.length <= 2) return names.join(', ');
  return `${names[0]} и ещё ${names.length - 1}`;
}

export default function TeacherBoardListPage() {
  const navigate = useNavigate();
  const { students, groups } = useTeacherWorkspace();
  const [boards, setBoards] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listTeacherBoards()
      .then((rows) => setBoards(rows))
      .catch((err) => {
        setBoards([]);
        setError(boardErrorMessage(err, 'Не удалось загрузить доски'));
      });
  }, []);

  async function handleCreate(body) {
    setError('');
    const board = await createTeacherBoard(body);
    await saveBoard(board);
    setBoards((prev) => [{
      id: board.id,
      title: board.title,
      teacherId: board.teacherId,
      groupId: board.groupId,
      studentIds: board.studentIds,
      updatedAt: board.updatedAt,
      objectCount: board.objects?.length ?? 0,
    }, ...(prev || [])]);
    setCreating(false);
    navigate(`/teacher/board/${board.id}`);
  }

  async function handleDelete(id) {
    try {
      await deleteTeacherBoard(id);
      await deleteBoard(id).catch(() => {});
      setBoards((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(boardErrorMessage(err, 'Не удалось удалить доску'));
      setConfirmDeleteId(null);
    }
  }

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Доски</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Один холст на доску. Его видят и правят вы и те, кому она назначена.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setCreating(true);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <Plus size={16} />
          Новая доска
        </button>
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
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Новая доска — это пустой холст для выбранных учеников или одной группы.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {boards.map((board) => (
            <article
              key={board.id}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                type="button"
                onClick={() => navigate(`/teacher/board/${board.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{board.title || 'Доска'}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {formatUpdated(board.updatedAt)}
                  {' · '}
                  {audienceLabel(board, students, groups)}
                  {' · '}
                  {objectCountLabel(board.objectCount ?? 0)}
                </p>
              </button>
              {confirmDeleteId === board.id ? (
                <button
                  type="button"
                  onClick={() => handleDelete(board.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Удалить
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Удалить доску"
                  onClick={() => setConfirmDeleteId(board.id)}
                  className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {creating && (
        <CreateBoardDialog
          students={students}
          groups={groups}
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      )}
    </PageShell>
  );
}

function CreateBoardDialog({ students, groups, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('students');
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (students || []).filter((person) => {
      if (!needle) return true;
      return `${person.first_name || ''} ${person.last_name || ''} ${person.username || ''}`.toLowerCase().includes(needle);
    });
  }, [students, query]);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (groups || []).filter((group) => !needle || String(group.name || '').toLowerCase().includes(needle));
  }, [groups, query]);

  function toggleStudent(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function submit(event) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError('Введите название');
      return;
    }
    if (mode === 'students' && selectedIds.length === 0) {
      setError('Выберите учеников');
      return;
    }
    if (mode === 'group' && !groupId) {
      setError('Выберите группу');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = mode === 'group'
        ? { title: nextTitle, groupId: Number(groupId) }
        : { title: nextTitle, studentIds: selectedIds.map((id) => Number(id)) };
      await onCreate(body);
    } catch (err) {
      setError(boardErrorMessage(err, 'Не удалось создать доску'));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#09090b]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Новая доска</h2>
            <p className="mt-1 text-sm text-zinc-500">Название и либо ученики, либо одна группа.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Название</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Дроби"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setMode('students')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === 'students' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              Ученики
            </button>
            <button
              type="button"
              onClick={() => setMode('group')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === 'group' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500'}`}
            >
              Группа
            </button>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === 'group' ? 'Поиск группы' : 'Поиск ученика'}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100"
          />

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {mode === 'students' ? (
              filteredStudents.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-zinc-500">Нет учеников</p>
              ) : filteredStudents.map((person) => {
                const checked = selectedIds.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${checked ? 'bg-zinc-100 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(person.id)}
                      className="h-4 w-4 accent-zinc-900"
                    />
                    <span className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">{personName(person)}</span>
                  </label>
                );
              })
            ) : filteredGroups.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-zinc-500">Нет групп</p>
            ) : filteredGroups.map((group) => (
              <label
                key={group.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${String(groupId) === String(group.id) ? 'bg-zinc-100 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}
              >
                <input
                  type="radio"
                  name="board-group"
                  checked={String(groupId) === String(group.id)}
                  onChange={() => setGroupId(group.id)}
                  className="h-4 w-4 accent-zinc-900"
                />
                <span className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">{group.name}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {saving ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
}
