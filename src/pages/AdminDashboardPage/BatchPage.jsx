import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import BatchTab from './BatchTab';

export default function BatchPage() {
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <BatchTab onSuccess={ws.refreshTasksMeta} />
    </PageShell>
  );
}
