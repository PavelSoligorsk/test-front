import { memo } from 'react';
import BoardTheoryPane from '../BoardTheoryPane';
import BoardTasksPane from '../BoardTasksPane';
import BoardStudentsPane from '../BoardStudentsPane';

const EMPTY_STUDENTS = [];

const BoardSidePanes = memo(function BoardSidePanes({ pane, kept, groupId, studentIds, onTheory, onTasks }) {
  if (!kept.theory && !kept.tasks && !kept.students) return null;
  const open = pane != null;
  return (
    <aside
      hidden={!open}
      inert={!open}
      className={`h-full min-w-0 w-1/2 overflow-hidden border-l border-zinc-200 [contain:layout_paint] dark:border-zinc-800 ${open ? 'hidden min-[720px]:block' : 'hidden'}`}
    >
      {kept.theory && (
        <div className="h-full" hidden={pane !== 'theory'} inert={pane !== 'theory'}>
          <BoardTheoryPane onCopy={onTheory} />
        </div>
      )}
      {kept.tasks && (
        <div className="h-full" hidden={pane !== 'tasks'} inert={pane !== 'tasks'}>
          <BoardTasksPane onCopy={onTasks} />
        </div>
      )}
      {kept.students && (
        <div className="h-full" hidden={pane !== 'students'} inert={pane !== 'students'}>
          <BoardStudentsPane groupId={groupId} studentIds={studentIds || EMPTY_STUDENTS} onCopy={onTasks} />
        </div>
      )}
    </aside>
  );
});


export default BoardSidePanes;
