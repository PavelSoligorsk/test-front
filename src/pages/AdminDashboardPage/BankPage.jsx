import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import BankTab from './BankTab';

export default function BankPage() {
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <BankTab
        tasksMeta={ws.tasksMeta}
        availableClasses={ws.availableClasses}
        bankClass={ws.bankClass}
        setBankClass={ws.setBankClass}
        bankTopic={ws.bankTopic}
        setBankTopic={ws.setBankTopic}
        onEditTask={ws.handleEditTask}
        onTasksUpdate={ws.refreshTasksMeta}
      />
    </PageShell>
  );
}
