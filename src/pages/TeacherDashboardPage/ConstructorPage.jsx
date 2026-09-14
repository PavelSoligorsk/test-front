import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import { TEACHER_PATHS } from './teacherPaths';
import TestConstructor from './TestConstructor';

export default function ConstructorPage() {
  const navigate = useNavigate();
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <TestConstructor
        selectedTasks={ws.selectedTasks}
        onTaskToggle={ws.toggleTaskSelection}
        openSolutions={ws.openSolutions}
        openHints={ws.openHints}
        onToggleSolution={ws.onToggleSolution}
        onToggleHint={ws.onToggleHint}
        onTestsUpdate={ws.fetchTests}
        onNavigateToBank={() => navigate(TEACHER_PATHS.bank)}
        onNavigateToTests={() => navigate(TEACHER_PATHS.tests)}
        editingTest={ws.editingTest}
        onClearEditing={() => ws.setEditingTest(null)}
        onClearTasks={() => ws.setSelectedTasks([])}
        onOpenAiGenerator={() => ws.setAiGeneratorModal(true)}
      />
    </PageShell>
  );
}
