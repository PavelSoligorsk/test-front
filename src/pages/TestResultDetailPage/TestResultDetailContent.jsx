import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import { QuestionMap } from '../../shared/ui';
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
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
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
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
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
        const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
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

  if (loading) return <div className="p-20 text-center font-black uppercase">Загрузка анализа...</div>;
  if (!data) return <div className="p-20 text-center font-black uppercase text-red-500">Ошибка загрузки данных</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px]">
          <ArrowLeft size={14} /> Назад в кабинет
        </button>

        <header className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-black">{data.test_title}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Результат прохождения</p>
          </div>
          <div className="bg-slate-950 text-white px-8 py-6 rounded-[2rem] text-center mt-4 md:mt-0">
            <div className="text-3xl font-black">{data.total_points} / {data.max_points}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Баллов набрано</div>
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
