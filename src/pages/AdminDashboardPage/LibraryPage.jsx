import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import { ADMIN_PATHS } from './adminPaths';
import TheoryBankTab from './TheoryBankTab';

export default function LibraryPage() {
  const navigate = useNavigate();
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <TheoryBankTab
        groupedTheory={ws.groupedTheory}
        selectedTopic={ws.selectedTopic}
        setSelectedTopic={ws.setSelectedTopic}
        selectedSection={ws.selectedSection}
        setSelectedSection={ws.setSelectedSection}
        filteredTheory={ws.filteredTheory}
        onEditTheory={(theory) => {
          ws.setTheoryData(theory);
          navigate(ADMIN_PATHS.theory);
        }}
        onDeleteTheory={ws.handleDeleteTheory}
        onAddNew={() => {
          ws.setTheoryData({
            id: null,
            topic: ws.selectedTopic,
            section: ws.selectedSection,
            content: '',
          });
          navigate(ADMIN_PATHS.theory);
        }}
      />
    </PageShell>
  );
}
