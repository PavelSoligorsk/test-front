import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../shared/ui';
import { useAdminWorkspace } from './AdminWorkspace';
import { ADMIN_PATHS } from './adminPaths';
import { nextArticlePriority } from '../../shared/lib/theoryMeta';
import TheoryBankTab from './TheoryBankTab';

export default function LibraryPage() {
  const navigate = useNavigate();
  const ws = useAdminWorkspace();
  return (
    <PageShell>
      <TheoryBankTab
        theoryMeta={ws.theoryMeta}
        selectedTheoryClass={ws.selectedTheoryClass}
        setSelectedTheoryClass={ws.setSelectedTheoryClass}
        selectedTopic={ws.selectedTopic}
        setSelectedTopic={ws.setSelectedTopic}
        selectedSection={ws.selectedSection}
        setSelectedSection={ws.setSelectedSection}
        onEditTheory={(theory) => {
          ws.setTheoryData({
            ...theory,
            theory_class: theory.theory_class ?? ws.selectedTheoryClass,
            priority: theory.priority ?? 0,
          });
          navigate(ADMIN_PATHS.theory);
        }}
        onDeleteTheory={ws.handleDeleteTheory}
        onMetaRefresh={ws.refreshTheoryMeta}
        onAddNew={() => {
          const cls = ws.selectedTheoryClass;
          ws.setTheoryData({
            id: null,
            topic: ws.selectedTopic || '',
            section: '',
            content: '',
            theory_class: cls,
            priority: nextArticlePriority(ws.theoryMeta, cls),
          });
          navigate(ADMIN_PATHS.theory);
        }}
      />
    </PageShell>
  );
}
