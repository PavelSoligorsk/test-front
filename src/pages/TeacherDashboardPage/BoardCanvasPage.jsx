import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { boardErrorMessage, getTeacherBoard, getTeacherLessonBoards } from '../../features/board/api';
import BoardEditor from '../../features/board/BoardEditor';
import { saveBoard } from '../../features/board/storage';
import { TEACHER_PATHS } from './teacherPaths';
import { useTeacherWorkspace } from './TeacherWorkspace';

function studentName(ownerId, students) {
  const person = (students || []).find((item) => String(item.id) === String(ownerId));
  if (!person) return 'Ученик';
  const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
  return name || person.username || 'Ученик';
}

export default function TeacherBoardCanvasPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { students } = useTeacherWorkspace();
  const [board, setBoard] = useState(null);
  const [pack, setPack] = useState(null);
  const [missingId, setMissingId] = useState(null);
  const [missingText, setMissingText] = useState('Доска не найдена');
  const missing = missingId === boardId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await getTeacherBoard(boardId);
        await saveBoard(remote);
        if (cancelled) return;
        setBoard(remote);
        if (remote.lessonId) {
          const lessonBoards = await getTeacherLessonBoards(remote.lessonId).catch(() => null);
          if (!cancelled) setPack(lessonBoards);
        }
      } catch (error) {
        if (cancelled) return;
        setMissingText(boardErrorMessage(error, error.response?.status === 404 ? 'Доска не найдена' : 'Не удалось открыть доску'));
        setMissingId(boardId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  if (missing) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{missingText}</p>
          <Link to={TEACHER_PATHS.board} className="mt-3 inline-block text-sm text-zinc-500 underline">
            К занятиям
          </Link>
        </div>
      </div>
    );
  }

  if (!board || board.id !== boardId) {
    return (
      <div className="grid h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
      </div>
    );
  }

  const classBoard = pack?.class;
  const notebooks = pack?.notebooks || [];
  const readOnly = board.kind !== 'class';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(classBoard || notebooks.length > 0) && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          {classBoard && (
            <button
              type="button"
              onClick={() => navigate(`/teacher/board/${classBoard.id}`)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${board.id === classBoard.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'}`}
            >
              Занятие
            </button>
          )}
          {notebooks.map((notebook) => (
            <button
              key={notebook.id}
              type="button"
              onClick={() => navigate(`/teacher/board/${notebook.id}`)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${board.id === notebook.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'}`}
            >
              {studentName(notebook.ownerId, students)}
            </button>
          ))}
          {readOnly && (
            <span className="shrink-0 text-xs text-zinc-500">Только просмотр</span>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <BoardEditor
          key={`${board.id}:${board.revision || 0}`}
          initialBoard={board}
          readOnly={readOnly}
          audience="teacher"
          backTo={TEACHER_PATHS.board}
          backLabel="Занятия"
        />
      </div>
    </div>
  );
}
