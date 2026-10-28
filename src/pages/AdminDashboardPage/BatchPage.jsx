import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './adminWorkspaceContext';
import BatchTab from './BatchTab';

export default function BatchPage() {
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <BatchTab onSuccess={ws.refreshTasksMeta} />
    </PageShell>
  );
}
