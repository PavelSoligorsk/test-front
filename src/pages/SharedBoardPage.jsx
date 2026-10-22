import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { boardErrorMessage, getSharedBoard } from '../features/board/api';
import BoardEditor from '../features/board/BoardEditor';
import { getCurrentUser } from '../shared/lib/session';

export default function SharedBoardPage() {
  const { shareToken } = useParams();
  const [board, setBoard] = useState(null);
  const [missing, setMissing] = useState('');
  const home = getCurrentUser()?.role === 'student' ? '/student/board' : '/teacher/board';

  useEffect(() => {
    let cancelled = false;
    getSharedBoard(shareToken)
      .then((data) => { if (!cancelled) setBoard(data); })
      .catch((error) => { if (!cancelled) setMissing(boardErrorMessage(error, 'Ссылка не действует')); });
    return () => { cancelled = true; };
  }, [shareToken]);

  if (missing) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{missing}</p>
          <Link to={home} className="mt-3 inline-block text-sm text-zinc-500 underline">К доскам</Link>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <BoardEditor
        key={`${board.id}:${shareToken}`}
        initialBoard={board}
        audience="shared"
        shareToken={shareToken}
        readOnly={board.canEdit === false}
        backTo={home}
        backLabel="Доски"
      />
    </div>
  );
}
