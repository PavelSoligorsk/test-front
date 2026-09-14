import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import AccessTab from './AccessTab';

export default function AccessPage() {
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <AccessTab
        allowedEmails={ws.allowedEmails}
        newEmail={ws.newEmail}
        setNewEmail={ws.setNewEmail}
        onAddEmail={ws.handleAddEmail}
        onDeleteEmail={ws.handleDeleteEmail}
      />
    </PageShell>
  );
}
