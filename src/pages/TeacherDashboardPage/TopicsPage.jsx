import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import TheoryBank from './TheoryBank';

export default function TopicsPage() {
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <TheoryBank
        tasksMeta={ws.topicSectionMeta}
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
