import { PageShell } from '../../shared/ui';
import { parallelScrollClass, useParallelScroll } from '../../shared/lib/parallelScroll';
import { useAdminWorkspace } from './AdminWorkspace';
import TaskForm from './TaskForm';
import TaskFormPreview from './TaskFormPreview';

export default function CreatePage() {
  const ws = useAdminWorkspace();
  const { leftRef, rightRef, onLeftScroll, onRightScroll } = useParallelScroll();
  return (
    <PageShell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
        <div ref={leftRef} onScroll={onLeftScroll} className={parallelScrollClass}>
          <TaskForm
            taskData={ws.taskData}
            setTaskData={ws.setTaskData}
            onSubmit={ws.handleTaskSubmit}
            onCancel={ws.handleCancelEdit}
          />
        </div>
        <div ref={rightRef} onScroll={onRightScroll} className={parallelScrollClass}>
          <TaskFormPreview taskData={ws.taskData} />
        </div>
      </div>
    </PageShell>
  );
}
