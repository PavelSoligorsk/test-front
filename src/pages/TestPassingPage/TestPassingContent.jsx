import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import DrawingPad from '../../components/DrawingPad';
import TestProgressBar from './TestProgressBar';
import TestQuestionCard from './TestQuestionCard';
import TestResultReport from './TestResultReport';

export default function TestPassingContent() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(() => {
    const saved = localStorage.getItem(`test_progress_${testId}`);
    return saved ? JSON.parse(saved).currentIdx : 0;
  });
  const [userAnswers, setUserAnswers] = useState(() => {
    const saved = localStorage.getItem(`test_progress_${testId}`);
    return saved ? JSON.parse(saved).answers : {};
  });
  const [drawings, setDrawings] = useState(() => {
    const saved = localStorage.getItem(`test_progress_${testId}`);
    return saved ? JSON.parse(saved).drawings || {} : {};
  });
  const [showDrawing, setShowDrawing] = useState({});
  const [finished, setFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hintData, setHintData] = useState({});
  const [hintLoading, setHintLoading] = useState({});
  const [hintUsed, setHintUsed] = useState({});

  const canvasRef = useRef(null);
  const currentTaskId = test?.tasks?.[currentIdx]?.id;

  const saveProgress = useCallback(() => {
    if (test && !finished) {
      localStorage.setItem(`test_progress_${testId}`, JSON.stringify({
        currentIdx,
        answers: userAnswers,
        drawings,
        timestamp: Date.now()
      }));
    }
  }, [currentIdx, userAnswers, drawings, testId, test, finished]);

  useEffect(() => {
    const timer = setTimeout(saveProgress, 500);
    return () => clearTimeout(timer);
  }, [currentIdx, userAnswers, drawings, saveProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  const saveCurrentDrawing = useCallback(() => {
    if (currentTaskId && canvasRef.current) {
      const dataUrl = canvasRef.current.save();
      setDrawings(prev => ({ ...prev, [currentTaskId]: dataUrl }));
    }
  }, [currentTaskId]);

  useEffect(() => {
    return () => { saveCurrentDrawing(); };
  }, [currentTaskId, saveCurrentDrawing]);

  useEffect(() => {
    let isMounted = true;
    const fetchTest = async () => {
      try {
        const session = localStorage.getItem('edu_session');
        const token = session ? JSON.parse(session)?.token : null;
        if (!token) return navigate('/login');

        const res = await axios.get(`${API_URL}/student/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!isMounted) return;
        if (res.data && res.data.tasks) {
          res.data.tasks.sort((a, b) => {
            if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
            if (a.id !== b.id) return a.id - b.id;
            return (a.difficulty || 0) - (b.difficulty || 0);
          });
        }
        setTest(res.data);

        const savedProgress = localStorage.getItem(`test_progress_${testId}`);
        if (savedProgress && isMounted) {
          const { currentIdx: savedIdx, answers: savedAnswers, drawings: savedDrawings, timestamp } = JSON.parse(savedProgress);
          const hoursSinceSave = (Date.now() - timestamp) / (1000 * 60 * 60);
          const alreadyRestored = localStorage.getItem(`test_restored_${testId}`);
          if (!alreadyRestored && hoursSinceSave < 24 && Object.keys(savedAnswers).length > 0) {
            localStorage.setItem(`test_restored_${testId}`, 'true');
            const shouldRestore = window.confirm('У вас есть сохранённый прогресс. Хотите продолжить с того места, где остановились?');
            if (shouldRestore) {
              setCurrentIdx(savedIdx);
              setUserAnswers(savedAnswers);
              setDrawings(savedDrawings || {});
            } else {
              localStorage.removeItem(`test_progress_${testId}`);
            }
          } else if (!alreadyRestored) {
            localStorage.removeItem(`test_progress_${testId}`);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки теста:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTest();
    return () => { isMounted = false; };
  }, [testId, navigate]);

  const currentTask = test?.tasks?.[currentIdx];

  const fetchHint = async (taskId) => {
    if (hintUsed[taskId]) return;
    setHintUsed(prev => ({ ...prev, [taskId]: true }));
    setHintLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const res = await axios.post(
        `${API_URL}/student/tasks/${taskId}/hint`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.hint) {
        setHintData(prev => ({ ...prev, [taskId]: res.data.hint }));
      }
    } catch (err) {
      console.error('Ошибка загрузки подсказки:', err);
      setHintData(prev => ({ ...prev, [taskId]: 'Не удалось загрузить подсказку. Попробуйте позже.' }));
    } finally {
      setHintLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleToggleAnswer = (index) => {
    const taskId = currentTask.id;
    const val = String(index + 1);
    const currentSelection = Array.isArray(userAnswers[taskId]) ? userAnswers[taskId] : [];
    if (currentSelection.includes(val)) {
      setUserAnswers({ ...userAnswers, [taskId]: currentSelection.filter(i => i !== val) });
    } else {
      setUserAnswers({ ...userAnswers, [taskId]: [...currentSelection, val] });
    }
  };

  const handleTextChange = (val) => {
    setUserAnswers({ ...userAnswers, [currentTask.id]: val });
  };

  const toggleDrawing = (taskId) => {
    setShowDrawing(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleDrawingSave = (taskId, dataUrl) => {
    setDrawings(prev => ({ ...prev, [taskId]: dataUrl }));
  };

  const handleDrawingDataChange = (taskId, dataUrl) => {
    setDrawings(prev => ({ ...prev, [taskId]: dataUrl }));
  };

  const submitTest = async () => {
    if (isSubmitting) return;
    saveCurrentDrawing();
    setIsSubmitting(true);
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const payload = Object.keys(userAnswers).map(id => ({
        task_id: parseInt(id),
        user_answer: Array.isArray(userAnswers[id]) ? userAnswers[id].sort((a, b) => a - b).join(',') : String(userAnswers[id])
      }));
      await axios.post(`${API_URL}/student/tests/${testId}/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.removeItem(`test_progress_${testId}`);
      localStorage.removeItem(`test_restored_${testId}`);
      setFinished(true);
    } catch (err) {
      alert("Не удалось отправить тест. Проверьте интернет-соединение.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (finished) {
    return <TestResultReport test={test} userAnswers={userAnswers} drawings={drawings} onBack={() => navigate('/student')} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <TestProgressBar
          test={test}
          currentIdx={currentIdx}
          userAnswers={userAnswers}
          onNavigate={(idx) => setCurrentIdx(idx)}
        />

        <TestQuestionCard
          currentTask={currentTask}
          currentIdx={currentIdx}
          userAnswers={userAnswers}
          onToggleAnswer={handleToggleAnswer}
          onTextChange={handleTextChange}
          hintUsed={hintUsed}
          hintLoading={hintLoading}
          hintData={hintData}
          onFetchHint={fetchHint}
          showDrawing={showDrawing}
          onToggleDrawing={toggleDrawing}
          canvasRef={canvasRef}
          drawings={drawings}
          onDrawingSave={handleDrawingSave}
          onDrawingDataChange={handleDrawingDataChange}
          DrawingPadComponent={DrawingPad}
        />

        <footer className="flex justify-between items-center pt-8">
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(v => v - 1)}
            className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest disabled:opacity-0 p-4 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft size={18} /> Назад
          </button>

          {currentIdx === test.tasks.length - 1 ? (
            <button
              onClick={submitTest}
              disabled={isSubmitting}
              className="px-12 py-5 bg-blue-600 text-white rounded-full font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:bg-slate-300"
            >
              {isSubmitting ? 'Отправка...' : 'Завершить работу'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx(v => v + 1)}
              className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-full font-black uppercase text-[11px] tracking-[0.15em] shadow-xl active:scale-95 transition-all"
            >
              Следующий шаг <ChevronRight size={18} />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
