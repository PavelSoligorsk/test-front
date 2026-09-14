import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import TaskForm from './TaskForm';
import TaskFormPreview from './TaskFormPreview';

export default function CreatePage() {
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskForm
          taskData={ws.taskData}
          setTaskData={ws.setTaskData}
          onSubmit={ws.handleTaskSubmit}
          onCancel={ws.handleCancelEdit}
        />
        <TaskFormPreview taskData={ws.taskData} />
      </div>
    </PageShell>
  );
}
