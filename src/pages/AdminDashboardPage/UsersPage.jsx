import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import UsersTab from './UsersTab';

export default function UsersPage() {
  const navigate = useNavigate();
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <UsersTab
        users={ws.users}
        filteredUsers={ws.filteredUsers}
        userSearch={ws.userSearch}
        setUserSearch={ws.setUserSearch}
        userRoleFilter={ws.userRoleFilter}
        setUserRoleFilter={ws.setUserRoleFilter}
        navigate={navigate}
        onUsersUpdate={ws.handleUsersUpdate}
      />
    </PageShell>
  );
}
