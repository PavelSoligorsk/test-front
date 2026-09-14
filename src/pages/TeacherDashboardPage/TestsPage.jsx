import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import { TEACHER_PATHS } from './teacherPaths';
import TestsListTab from './TestsListTab';

export default function TestsPage() {
  const navigate = useNavigate();
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <TestsListTab
        tests={ws.tests}
        onEdit={ws.handleEditTest}
        onDelete={ws.handleDeleteTest}
        onManage={(test) => ws.setManageTestModal(test)}
        onCreateClick={() => navigate(TEACHER_PATHS.constructor)}
      />
    </PageShell>
  );
}
