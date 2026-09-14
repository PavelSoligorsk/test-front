import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useTeacherWorkspace } from './TeacherWorkspace';
import GroupsTab from './GroupsTab';

export default function GroupsPage() {
  const navigate = useNavigate();
  const ws = useTeacherWorkspace();
  return (
    <PageShell>
      <GroupsTab
        groups={ws.groups}
        onOpenCreate={() => ws.setGroupCreateModal({ id: null, name: '', description: '', students: [] })}
        onEdit={(g) => ws.setGroupCreateModal(g)}
        onDelete={ws.handleDeleteGroup}
        onManageStudents={(g) => ws.setGroupStudentsModal(g)}
        onAssignTest={(g) => ws.setAssignGroupModal(g)}
        onDetail={(g) => ws.setGroupDetailModal(g)}
        navigate={navigate}
      />
    </PageShell>
  );
}
