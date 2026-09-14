import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import TheoryConstructorTab from './TheoryConstructorTab';

export default function TheoryConstructorPage() {
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <TheoryConstructorTab
        theoryData={ws.theoryData}
        setTheoryData={ws.setTheoryData}
        onSubmit={ws.handleTheorySubmit}
      />
    </PageShell>
  );
}
