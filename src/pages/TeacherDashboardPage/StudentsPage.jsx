import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import StudentsTab from './StudentsTab';

export default function StudentsPage() {
  const navigate = useNavigate();
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <StudentsTab students={ws.students} navigate={navigate} />
    </PageShell>
  );
}
