import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import CalendarTab from './CalendarTab';

export default function CalendarPage() {
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <CalendarTab
        students={ws.students}
        groups={ws.groups}
        onRefresh={() => { ws.fetchStudents(); ws.fetchGroups(); }}
      />
    </PageShell>
  );
}
