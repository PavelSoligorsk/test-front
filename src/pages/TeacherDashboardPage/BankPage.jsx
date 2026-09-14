import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import TestBank from './TestBank';

export default function BankPage() {
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <TestBank
        onTaskToggle={ws.toggleTaskSelection}
        selectedTasks={ws.selectedTasks}
        openSolutions={ws.openSolutions}
        openHints={ws.openHints}
        onToggleSolution={ws.onToggleSolution}
        onToggleHint={ws.onToggleHint}
      />
    </PageShell>
  );
}
