import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentHistory, retakeTest } from './api';
import { AttemptHistory } from '../../shared/ui';
import StudentPageLoading from './StudentPageLoading';
import { PageShell } from '../../shared/ui/Sheet';
import { useNotify } from '../../shared/ui';

export default function HistoryPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentHistory()
      .then((data) => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleRetake = async (resultId, testIdOverride) => {
    try {
      const retakeData = await retakeTest(resultId);
      navigate(`/test/${testIdOverride || retakeData.test_id || resultId}?retake=1`, { state: { startData: retakeData } });
    } catch (err) {
      notify(err.response?.data?.detail || 'Не удалось начать пересдачу. Проверьте лимит попыток.');
    }
  };

  if (loading) return <StudentPageLoading variant="history" />;

  return (
    <PageShell>
      <AttemptHistory
        items={history}
        onOpen={(row) => navigate(`/result/${row.id}`)}
        onContinue={(row) => navigate(`/test/${row.testId}`)}
        onRetake={(row) => handleRetake(row.id, row.testId)}
        onMistakes={(row) => navigate(`/result/${row.id}/mistakes`)}
      />
    </PageShell>
  );
}
