import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentHistory, retakeTest } from './api';
import HistoryTab from './HistoryTab';
import StudentPageLoading from './StudentPageLoading';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
      alert(err.response?.data?.detail || 'Не удалось начать пересдачу. Проверьте лимит попыток.');
    }
  };

  const filteredHistory = history.filter(item => item.test_title?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <StudentPageLoading variant="history" />;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8">
      <HistoryTab filteredHistory={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onRetake={handleRetake} />
    </main>
  );
}
