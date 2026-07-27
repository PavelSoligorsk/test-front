
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Clock, AlertTriangle, XCircle, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import { retakeTest } from '../StudentDashboardPage/api';
import DrawingPad from '../../components/DrawingPad';
import TestProgressBar from './TestProgressBar';
import TestQuestionCard from './TestQuestionCard';
import TestResultReport from './TestResultReport';

function formatTime(seconds) {
  if (seconds == null || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getToken() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return session?.token || session?.access_token || null;
  } catch { return null; }
}

export default function TestPassingContent() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isAi = searchParams.get('type') === 'ai';
  const startData = location.state?.startData;

  // ── Constraint / block error ──
  const [blockError, setBlockError] = useState(null);

  // ── Attempt / timer metadata from start response ──
  const [resultId, setResultId] = useState(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(null);
  const [allowInterruptions, setAllowInterruptions] = useState(true);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(null);
  const [examStart, setExamStart] = useState(null);
  const [examEnd, setExamEnd] = useState(null);

  // ── Test content ──
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [drawings, setDrawings] = useState({});
  const [showDrawing, setShowDrawing] = useState({});
  const [finished, setFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Timer ──
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerWarning, setTimerWarning] = useState(false);
  const timerRef = useRef(null);
  const timeSpentRef = useRef(0);
  const submittedRef = useRef(false);

  // ── Hints ──
  const [hintData, setHintData] = useState({});
  const [hintLoading, setHintLoading] = useState({});
  const [hintUsed, setHintUsed] = useState({});

  const canvasRef = useRef(null);
  const submitRef = useRef(null);
  const finishedRef = useRef(false);
  const currentTaskId = test?.tasks?.[currentIdx]?.id;

  const saveProgress = useCallback(() => {
    if (test && !finishedRef.current && allowInterruptions) {
      localStorage.setItem(`test_progress_${testId}`, JSON.stringify({
        currentIdx,
        answers: userAnswers,
        drawings,
        timestamp: Date.now(),
        timeRemaining,
      }));
    }
  }, [currentIdx, userAnswers, drawings, testId, test, timeRemaining, allowInterruptions]);

  useEffect(() => {
    const timer = setTimeout(saveProgress, 500);
    return () => clearTimeout(timer);
  }, [currentIdx, userAnswers, drawings, saveProgress]);

  useEffect(() => {
    if (!allowInterruptions) return;
    const handleBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress, allowInterruptions]);

  const saveCurrentDrawing = useCallback(() => {
    if (currentTaskId && canvasRef.current) {
      const dataUrl = canvasRef.current.save();
      setDrawings(prev => ({ ...prev, [currentTaskId]: dataUrl }));
    }
  }, [currentTaskId]);

  useEffect(() => {
    return () => { saveCurrentDrawing(); };
  }, [currentTaskId, saveCurrentDrawing]);

  // ── Submit function ──
  const doSubmit = useCallback(async (answers) => {
    if (submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const token = getToken();
      const effectiveTestId = test?.id ?? parseInt(testId);
      const payload = Object.keys(answers).map(id => ({
        task_id: parseInt(id),
        user_answer: Array.isArray(answers[id])
          ? answers[id].sort((a, b) => a - b).join(',')
          : String(answers[id]),
      }));
      await axios.post(`${API_URL}/student/tests/${effectiveTestId}/submit`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      localStorage.removeItem(`test_progress_${testId}`);
      localStorage.removeItem(`test_restored_${testId}`);
      finishedRef.current = true;
      setFinished(true);
    } catch (err) {
      submittedRef.current = false;
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setSubmitError(detail);
      } else {
        alert('Не удалось отправить тест. Проверьте интернет-соединение.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [testId, test?.id, isSubmitting]);

  submitRef.current = doSubmit;

  // ── Timer countdown ──
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || finishedRef.current || blockError) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev == null) return null;
        timeSpentRef.current += 1;
        const next = prev - 1;
        if (next <= 60 && next > 0) setTimerWarning(true);
        if (next <= 0) {
          clearInterval(timerRef.current);
          if (!finishedRef.current) {
            finishedRef.current = true;
            // flush latest answers then submit
            setUserAnswers(current => {
              submitRef.current?.(current);
              return current;
            });
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeRemaining !== null, blockError]);

  // ── Initialisation: start test via POST endpoint ──
  useEffect(() => {
    let cancelled = false;

    // For retakes: use pre-fetched startData directly
    if (startData?.tasks?.length > 0) {
      const d = startData;
      const tasks = [...d.tasks].sort((a, b) => {
        if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
        if (a.id !== b.id) return a.id - b.id;
        return (a.difficulty || 0) - (b.difficulty || 0);
      });
      const limit = d.time_limit_minutes ?? null;
      const interruptions = d.allow_interruptions ?? true;
      const spent = d.time_spent_seconds ?? 0;
      const totalSec = limit != null ? limit * 60 : null;

      setResultId(d.result_id);
      setTimeLimitMinutes(limit);
      setAllowInterruptions(interruptions);
      setAttemptsUsed(d.attempts_used ?? 0);
      setMaxAttempts(d.max_attempts ?? null);
      if (limit != null) {
        setTimeRemaining(Math.max(0, totalSec - spent));
        timeSpentRef.current = spent;
      }
      setTest({ id: d.test_id ?? testId, title: d.test_title, tasks, time_limit_minutes: limit, max_attempts: d.max_attempts, allow_interruptions: interruptions });
      setExamStart(d.exam_start ?? null);
      setExamEnd(d.exam_end ?? null);
      setLoading(false);
      return;
    }

    const init = async () => {
      const token = getToken();
      if (!token) return navigate('/login');

      try {
        const startUrl = isAi
          ? `${API_URL}/student/start-ai-test/${testId}`
          : `${API_URL}/student/start-test/${testId}`;

        const res = await axios.post(startUrl, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        const d = res.data;
        const tasks = [...(d.tasks || [])].sort((a, b) => {
          if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
          if (a.id !== b.id) return a.id - b.id;
          return (a.difficulty || 0) - (b.difficulty || 0);
        });
        const limit = d.time_limit_minutes ?? null;
        const interruptions = d.allow_interruptions ?? true;
        const spent = d.time_spent_seconds ?? 0;
        const totalSec = limit != null ? limit * 60 : null;

        setResultId(d.result_id);
        setTimeLimitMinutes(limit);
        setAllowInterruptions(interruptions);
        setAttemptsUsed(d.attempts_used ?? 0);
        setMaxAttempts(d.max_attempts ?? null);

        if (limit != null) {
          setTimeRemaining(Math.max(0, totalSec - spent));
          timeSpentRef.current = spent;
        }

        setTest({
          id: parseInt(testId),
          title: d.test_title,
          tasks,
          time_limit_minutes: limit,
          max_attempts: d.max_attempts ?? null,
          allow_interruptions: interruptions,
          exam_start: d.exam_start ?? null,
          exam_end: d.exam_end ?? null,
        });

        setExamStart(d.exam_start ?? null);
        setExamEnd(d.exam_end ?? null);

        // Restore saved progress (only in interruptible mode)
        if (interruptions !== false) {
          const savedProgress = localStorage.getItem(`test_progress_${testId}`);
          if (savedProgress && !cancelled) {
            const parsed = JSON.parse(savedProgress);
            const hoursSinceSave = (Date.now() - parsed.timestamp) / 3600000;
            const alreadyRestored = localStorage.getItem(`test_restored_${testId}`);
            if (!alreadyRestored && hoursSinceSave < 24 && Object.keys(parsed.answers || {}).length > 0) {
              localStorage.setItem(`test_restored_${testId}`, 'true');
              const shouldRestore = window.confirm(
                'У вас есть сохранённый прогресс. Хотите продолжить с того места, где остановились?'
              );
              if (shouldRestore) {
                setCurrentIdx(parsed.currentIdx || 0);
                setUserAnswers(parsed.answers || {});
                setDrawings(parsed.drawings || {});
                if (parsed.timeRemaining != null && limit != null) {
                  setTimeRemaining(Math.max(0, parsed.timeRemaining));
                  timeSpentRef.current = totalSec - parsed.timeRemaining;
                }
              } else {
                localStorage.removeItem(`test_progress_${testId}`);
              }
            } else if (!alreadyRestored) {
              localStorage.removeItem(`test_progress_${testId}`);
            }
          }
        } else {
          // Non-interruptible: clear any stale progress
          localStorage.removeItem(`test_progress_${testId}`);
          localStorage.removeItem(`test_restored_${testId}`);
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const detail = err.response?.data?.detail;
        const status = err.response?.status;
        if (status === 401) return navigate('/login');
        setBlockError(typeof detail === 'string' ? detail : 'Не удалось начать тест. Попробуйте позже.');
        setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [testId, isAi]);

  // ── Current task ──
  const currentTask = test?.tasks?.[currentIdx];

  const fetchHint = async (taskId) => {
    if (hintUsed[taskId]) return;
    setHintUsed(prev => ({ ...prev, [taskId]: true }));
    setHintLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/student/tasks/${taskId}/hint`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.hint) {
        setHintData(prev => ({ ...prev, [taskId]: res.data.hint }));
      }
    } catch (err) {
      setHintData(prev => ({ ...prev, [taskId]: 'Не удалось загрузить подсказку. Попробуйте позже.' }));
    } finally {
      setHintLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleToggleAnswer = (index) => {
    if (!currentTask) return;
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
    if (!currentTask) return;
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

  const handleSubmitClick = () => {
    saveCurrentDrawing();
    doSubmit(userAnswers);
  };

  const handleRetakeInReport = async () => {
    if (!resultId) return;
    try {
      const retakeData = await retakeTest(resultId);
      const effectiveTestId = retakeData.test_id || testId;
      navigate(`/test/${effectiveTestId}?retake=1`, { replace: true, state: { startData: retakeData } });
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Не удалось начать пересдачу. Проверьте лимит попыток.');
    }
  };

  // ── Block error screen (constraint violations) ──
  if (blockError) {
    const isExamNotStarted = /Экзамен ещё не начался/i.test(blockError);
    const isExamEnded = /Экзамен уже завершён/i.test(blockError);
    const isAttemptsExhausted = /исчерпали лимит попыток/i.test(blockError);
    const isTimeUp = /Время вышло/i.test(blockError);
    const isDeactivated = /деактивирован/i.test(blockError);
    const isPastDue = /Срок выполнения.*истёк/i.test(blockError);
    const isNoTasks = /не содержит заданий/i.test(blockError);

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 text-center space-y-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
            isExamNotStarted ? 'bg-blue-50' :
            isExamEnded || isTimeUp ? 'bg-red-50' :
            isAttemptsExhausted ? 'bg-amber-50' :
            'bg-red-50'
          }`}>
            {isExamNotStarted ? <CalendarIcon size={32} className="text-blue-500" /> :
             isExamEnded || isTimeUp ? <Clock size={32} className="text-red-400" /> :
             isAttemptsExhausted ? <RotateCcw size={32} className="text-amber-500" /> :
             <AlertTriangle size={32} className="text-red-400" />}
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase">
            {isExamNotStarted ? 'Экзамен ещё не начался' :
             isExamEnded ? 'Экзамен завершён' :
             isAttemptsExhausted ? 'Лимит попыток исчерпан' :
             isTimeUp ? 'Время вышло' :
             'Тест недоступен'}
          </h2>
          <p className="text-sm font-bold text-slate-500 leading-relaxed">{blockError}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/student')}
              className="px-8 py-3 bg-slate-900 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition"
            >
              К тестам
            </button>
            {isExamNotStarted && (
              <button
                onClick={() => navigate(`/result/${resultId}`)}
                className="px-8 py-3 bg-blue-50 text-blue-600 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 transition border border-blue-200"
              >
                К результатам
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (finished) {
    return (
      <TestResultReport
        test={test}
        userAnswers={userAnswers}
        drawings={drawings}
        onBack={() => navigate('/student')}
        testId={testId}
        resultId={resultId}
        onRetake={handleRetakeInReport}
      />
    );
  }

  if (submitError) {
    const isRetryable = submitError && !/Экзамен|исчерпали|Время вышло|деактивирован|Срок/i.test(submitError);
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase">Ошибка отправки</h2>
          <p className="text-sm font-bold text-slate-500 leading-relaxed">{submitError}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/student')}
              className="px-8 py-3 bg-slate-100 text-slate-600 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition"
            >
              К тестам
            </button>
            {isRetryable && (
              <button
                onClick={() => { setSubmitError(null); submittedRef.current = false; doSubmit(userAnswers); }}
                className="px-8 py-3 bg-blue-600 text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                Повторить
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hasTimer = timeLimitMinutes != null;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* ── Timer bar ── */}
        {hasTimer && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border shadow-sm transition-colors ${
            timerWarning ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-white border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <Clock size={18} className={timerWarning ? 'text-red-500' : 'text-slate-400'} />
              <span className={`text-sm font-black uppercase tracking-widest ${timerWarning ? 'text-red-600' : 'text-slate-600'}`}>
                Осталось времени
              </span>
            </div>
            <span className={`text-xl font-black italic tabular-nums ${timerWarning ? 'text-red-600' : 'text-slate-900'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {/* ── Attempts indicator ── */}
        {attemptsLeft != null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-500 shadow-sm">
            <RotateCcw size={12} />
            Попытка {attemptsUsed + 1} из {maxAttempts}{' '}
            {attemptsLeft <= 1 && (
              <span className="text-amber-600 ml-1">(последняя)</span>
            )}
          </div>
        )}

        {/* ── Exam window info ── */}
        {examStart && examEnd && !blockError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-2xl text-[10px] font-bold text-purple-600">
            <CalendarIcon size={12} />
            Экзамен:{' '}
            {new Date(examStart).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' — '}
            {new Date(examEnd).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* ── Mode hints ── */}
        {!hasTimer && allowInterruptions && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] font-bold text-blue-600">
            <AlertTriangle size={12} />
            Прогресс сохраняется — можно продолжить позже
          </div>
        )}
        {hasTimer && !allowInterruptions && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] font-bold text-amber-600">
            <AlertTriangle size={12} />
            Тест нужно пройти за один присест. При выходе попытка будет потеряна.
          </div>
        )}

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
              onClick={handleSubmitClick}
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
