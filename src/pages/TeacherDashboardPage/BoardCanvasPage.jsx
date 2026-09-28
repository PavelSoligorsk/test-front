import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { boardErrorMessage, getTeacherBoard } from '../../features/board/api';
import BoardEditor from '../../features/board/BoardEditor';
import { saveBoard } from '../../features/board/storage';
import { TEACHER_PATHS } from './teacherPaths';

export default function TeacherBoardCanvasPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
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
            К списку досок
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

  return (
    <BoardEditor
      key={`${board.id}:${board.revision || 0}`}
      initialBoard={board}
      audience="teacher"
      backTo={TEACHER_PATHS.board}
      backLabel="Доски"
    />
  );
}
