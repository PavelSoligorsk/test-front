import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import { QuestionMap, ThemeToggle } from '../../shared/ui';
import { getHomeRoute, getUserRole } from '../../features/auth';
import DifficultyStats from './DifficultyStats';
import ResultTaskCard from './ResultTaskCard';

export default function TestResultDetailContent() {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSolutions, setOpenSolutions] = useState({});

  // Для подсказок
  const [hintData, setHintData] = useState({});
  const [loadingHint, setLoadingHint] = useState({});
  const [hintError, setHintError] = useState({});

  // Для AI-решений
  const [solutionData, setSolutionData] = useState({});
  const [loadingSolution, setLoadingSolution] = useState({});
  const [solutionError, setSolutionError] = useState({});

  const toggleSolution = (id) => {
    setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchHint = async (taskId) => {
    setLoadingHint(prev => ({ ...prev, [taskId]: true }));
    setHintError(prev => ({ ...prev, [taskId]: null }));
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token || session?.access_token;
      const response = await axios.post(
        `${API_URL}/student/tasks/${taskId}/hint`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHintData(prev => ({ ...prev, [taskId]: response.data.hint }));
    } catch (err) {
      setHintError(prev => ({ ...prev, [taskId]: err.response?.data?.detail || "Ошибка получения подсказки" }));
    } finally {
      setLoadingHint(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const closeHint = (taskId) => {
    setHintData(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    setHintError(prev => { const n = { ...prev }; delete n[taskId]; return n; });
  };

  const fetchSolution = async (taskId) => {
    setLoadingSolution(prev => ({ ...prev, [taskId]: true }));
    setSolutionError(prev => ({ ...prev, [taskId]: null }));
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token || session?.access_token;
      const response = await axios.post(
        `${API_URL}/student/tasks/${taskId}/ai-solve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSolutionData(prev => ({ ...prev, [taskId]: response.data }));
    } catch (err) {
      setSolutionError(prev => ({ ...prev, [taskId]: err.response?.data?.detail || "Ошибка получения решения" }));
    } finally {
      setLoadingSolution(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const closeSolution = (taskId) => {
    setSolutionData(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    setSolutionError(prev => { const n = { ...prev }; delete n[taskId]; return n; });
  };

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
        const token = session?.token || session?.access_token;
        const res = await axios.get(`${API_URL}/student/results/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        console.error('Ошибка загрузки результата:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  const sortedDetails = useMemo(() => {
    if (!data?.details) return [];
    return [...data.details].sort((a, b) => {
      if (a.task_id !== b.task_id) return a.task_id - b.task_id;
      const aHasOptions = a.options ? 0 : 1;
      const bHasOptions = b.options ? 0 : 1;
      if (aHasOptions !== bHasOptions) return aHasOptions - bHasOptions;
      return (a.difficulty || 0) - (b.difficulty || 0);
    });
  }, [data]);

  if (loading) return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-6 text-center">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <p className="text-sm font-medium text-red-600">Ошибка загрузки данных</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] pb-20">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(getHomeRoute(getUserRole()))} className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft size={14} /> Назад в кабинет
          </button>
          <ThemeToggle />
        </div>

        <header className="bg-white dark:bg-[#09090b] p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{data.test_title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Результат прохождения</p>
          </div>
          <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-6 py-4 rounded-2xl text-center">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">{data.total_points} / {data.max_points}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">баллов</div>
          </div>
        </header>

        <DifficultyStats difficultyStats={data.difficulty_stats} />

        <div className="space-y-6">
          {sortedDetails.map((item, idx) => (
            <ResultTaskCard
              key={item.task_id}
              item={item}
              idx={idx}
              openSolutions={openSolutions}
              toggleSolution={toggleSolution}
              hintData={hintData}
              loadingHint={loadingHint}
              hintError={hintError}
              fetchHint={fetchHint}
              closeHint={closeHint}
              solutionData={solutionData}
              loadingSolution={loadingSolution}
              solutionError={solutionError}
              fetchSolution={fetchSolution}
              closeSolution={closeSolution}
            />
          ))}
        </div>
      </div>

      <QuestionMap
        mode="result"
        details={sortedDetails}
        onScroll={(taskId) => {
          const el = document.querySelector(`[data-task-id="${taskId}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />
    </div>
  );
}
