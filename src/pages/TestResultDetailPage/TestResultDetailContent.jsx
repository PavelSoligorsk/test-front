import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import apiClient from '../../shared/api';
import { QuestionMap, ThemeToggle } from '../../shared/ui';
import { rememberedStudentPath } from '../StudentDashboardPage/studentPaths';
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
      const response = await apiClient.post(`/student/tasks/${taskId}/hint`,
        {}
      );
      setHintData(prev => ({ ...prev, [taskId]: response.data }));
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
      const response = await apiClient.post(`/student/tasks/${taskId}/ai-solve`,
        {}
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
        const res = await apiClient.get(`/student/results/${resultId}`);
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
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(rememberedStudentPath())} className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft size={14} /> Назад в кабинет
          </button>
          <ThemeToggle />
        </div>

        <header className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/60 sm:px-6">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{data.test_title}</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Результат прохождения</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {data.max_points > 0 ? Math.round((data.total_points / data.max_points) * 100) : 0}%
              </p>
              <p className="mt-1 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {data.total_points} / {data.max_points}
              </p>
            </div>
          </div>
          <div className="px-2 py-3 sm:px-4">
            <DifficultyStats difficultyStats={data.difficulty_stats} />
          </div>
        </header>

        <div className="space-y-3">
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
