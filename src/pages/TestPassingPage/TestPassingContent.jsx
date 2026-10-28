import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Clock, AlertTriangle, XCircle, RotateCcw, Calendar as CalendarIcon, LogOut, BookOpen, ClipboardList } from 'lucide-react';
import { ThemeToggle, useConfirm, useNotify } from '../../shared/ui';
import apiClient from '../../shared/api';
import { getToken } from '../../shared/lib/session';
import { API_URL } from '../../shared/config';
import { retakeTest } from '../StudentDashboardPage/api';
import { ENDPOINTS } from '../../shared/api/endpoints';
import { getHomeRoute, getUserRole } from '../../features/auth';
import DrawingPad from '../../components/DrawingPad';
import TestProgressBar from './TestProgressBar';
import TestQuestionCard from './TestQuestionCard';
import TestResultReport from './TestResultReport';
import TestTheoryPanel from './TestTheoryPanel';

function formatTime(seconds) {
  if (seconds == null || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Сначала тестовые задания, потом открытые; внутри — по id и сложности.
function sortTasks(tasks) {
  return [...(tasks || [])].sort((a, b) => {
    if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
    if (a.id !== b.id) return a.id - b.id;
    return (a.difficulty || 0) - (b.difficulty || 0);
  });
}

/** Попытка из ответа старта (пересдача приносит его в state навигации, иначе — POST start-test). */
function readAttempt(d, test) {
  const limit = d.time_limit_minutes ?? null;
  const interruptions = d.allow_interruptions ?? true;
  const spent = d.time_spent_seconds ?? 0;
  const prevAnswers = Array.isArray(d.previous_answers) ? d.previous_answers : [];
  const answers = {};
  prevAnswers.forEach((a) => { answers[a.task_id] = a.user_answer; });
  return {
    resultId: d.result_id,
    timeLimitMinutes: limit,
    allowInterruptions: interruptions,
    attemptsUsed: d.attempts_used ?? 0,
    maxAttempts: d.max_attempts ?? null,
    examStart: d.exam_start ?? null,
    examEnd: d.exam_end ?? null,
    totalSeconds: limit != null ? limit * 60 : null,
    timeSpent: spent,
    timeRemaining: limit != null ? Math.max(0, limit * 60 - spent) : null,
    answers: prevAnswers.length > 0 ? answers : null,
    test: {
      title: d.test_title,
      tasks: sortTasks(d.tasks),
      time_limit_minutes: limit,
      max_attempts: d.max_attempts ?? null,
      allow_interruptions: interruptions,
      ...test,
    },
  };
}

export default function TestPassingContent() {
  const confirm = useConfirm();
  const notify = useNotify();
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isAi = searchParams.get('type') === 'ai';
  const startData = location.state?.startData;

  const [theoryOpen, setTheoryOpen] = useState(false);

  // ── Constraint / block error ──
  const [blockError, setBlockError] = useState(null);

  // ── Attempt: из state навигации (пересдача) сразу, иначе — после POST start-test ──
  const [startAttempt] = useState(() => (startData?.tasks?.length > 0
    ? readAttempt(startData, { id: startData.test_id ?? testId })
    : null));
  const [attempt, setAttempt] = useState(startAttempt);
  const {
    resultId = null,
    timeLimitMinutes = null,
    allowInterruptions = true,
    attemptsUsed = 0,
    maxAttempts = null,
    examStart = null,
    examEnd = null,
  } = attempt || {};

  // ── Test content ──
  const test = attempt?.test ?? null;
  const loading = !test && !blockError;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState(() => startAttempt?.answers ?? {});
  const [drawings, setDrawings] = useState({});
  const [showDrawing, setShowDrawing] = useState({});
  const [finished, setFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Timer ──
  const [timeRemaining, setTimeRemaining] = useState(() => startAttempt?.timeRemaining ?? null);
  const timerWarning = timeRemaining != null && timeRemaining <= 60;
  const timeSpentRef = useRef(startAttempt?.timeRemaining != null ? startAttempt.timeSpent : 0);
  const submittedRef = useRef(false);

  // ── Hints ──
  const [hintData, setHintData] = useState({});
  const [hintLoading, setHintLoading] = useState({});
  const [hintUsed, setHintUsed] = useState({});

  // ── Refs for scroll management ──
  const canvasRef = useRef(null);
  const submitRef = useRef(null);
  const finishedRef = useRef(false);
  const currentTaskId = test?.tasks?.[currentIdx]?.id;

  const savedToServerRef = useRef(Boolean(startAttempt?.answers));
  // Таймер отправляет то, что успели ответить к последнему рендеру.
  const answersRef = useRef(userAnswers);
  useLayoutEffect(() => {
    answersRef.current = userAnswers;
  });

  // Shared helper: build payload array from answers object
  const buildAnswersPayload = useCallback((answers) =>
    Object.keys(answers).map(id => ({
      task_id: parseInt(id),
      user_answer: Array.isArray(answers[id])
        ? answers[id].sort((a, b) => a - b).join(',')
        : String(answers[id]),
    }))
  , []);

  // Save progress to localStorage (fast, local backup)
  const saveProgressLocal = useCallback(() => {
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

  // Save progress to server (incremental persistence)
  const saveProgressToServer = useCallback(async (answersOverride) => {
    if (!test || finishedRef.current || !allowInterruptions) return;
    const effectiveAnswers = answersOverride || userAnswers;
    if (Object.keys(effectiveAnswers).length === 0) return;
    const effectiveTestId = test?.id ?? parseInt(testId);
    try {
      const payload = buildAnswersPayload(effectiveAnswers);
      await apiClient.post(ENDPOINTS.STUDENT_SAVE_PROGRESS(effectiveTestId),
        { answers: payload }
      );
      savedToServerRef.current = true;
    } catch (e) {
      console.warn('save-progress failed, will retry:', e);
    }
  }, [test, testId, userAnswers, allowInterruptions, buildAnswersPayload]);

  // Combined save: local + server
  const saveProgress = useCallback(async (answersOverride) => {
    saveProgressLocal();
    await saveProgressToServer(answersOverride);
  }, [saveProgressLocal, saveProgressToServer]);

  useEffect(() => {
    const timer = setTimeout(() => saveProgress(), 500);
    return () => clearTimeout(timer);
  }, [currentIdx, userAnswers, drawings, saveProgress]);

  // Auto-save to server every 45 seconds
  useEffect(() => {
    if (!allowInterruptions) return;
    const interval = setInterval(() => {
      saveProgressToServer();
    }, 45000);
    return () => clearInterval(interval);
  }, [allowInterruptions, saveProgressToServer]);

  // beforeunload: use fetch keepalive for reliable server save on tab close
  useEffect(() => {
    if (!allowInterruptions) return;
    const handleBeforeUnload = () => {
      saveProgressLocal();
      if (Object.keys(userAnswers).length > 0) {
        const effectiveTestId = test?.id ?? parseInt(testId);
        const payload = buildAnswersPayload(userAnswers);
        const url = `${API_URL}${ENDPOINTS.STUDENT_SAVE_PROGRESS(effectiveTestId)}`;
        const token = getToken();
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ answers: payload }),
          keepalive: true,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgressLocal, userAnswers, testId, test, allowInterruptions, buildAnswersPayload]);

  const saveCurrentDrawing = useCallback(() => {
    if (currentTaskId && canvasRef.current) {
      const dataUrl = canvasRef.current.save();
      setDrawings(prev => ({ ...prev, [currentTaskId]: dataUrl }));
    }
  }, [currentTaskId]);

  useEffect(() => {
    return () => { saveCurrentDrawing(); };
  }, [currentTaskId, saveCurrentDrawing]);

  const openTheory = async () => {
    if (theoryOpen) return;
    saveCurrentDrawing();
    await saveProgress();
    setTheoryOpen(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const closeTheory = () => {
    setTheoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // ── Submit function ──
  const testDbId = test?.id;
  const doSubmit = useCallback(async (answers) => {
    if (submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      const effectiveTestId = testDbId ?? parseInt(testId);

      const hasSavedToServer = savedToServerRef.current;
      let payload;
      if (answers == null || Object.keys(answers).length === 0) {
        if (hasSavedToServer) {
          payload = [];
        } else {
          payload = buildAnswersPayload(userAnswers);
        }
      } else {
        payload = buildAnswersPayload(answers);
      }

      await apiClient.post(`/student/tests/${effectiveTestId}/submit`, payload);
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
        notify('Не удалось отправить тест. Проверьте интернет-соединение.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [testId, testDbId, isSubmitting, userAnswers, buildAnswersPayload, notify]);

  useLayoutEffect(() => {
    submitRef.current = doSubmit;
  });

  // ── Timer countdown ──
  // Интервал живёт, пока есть время; при нуле отправка ниже. Если время кончилось ещё до
  // открытия (0 при загрузке), сами не отправляем — как и раньше.
  const timerRunning = timeRemaining !== null && timeRemaining > 0;
  const countdownRef = useRef(false);
  useEffect(() => {
    if (!timerRunning || finishedRef.current || blockError) return undefined;
    countdownRef.current = true;
    const timer = setInterval(() => {
      timeSpentRef.current += 1;
      setTimeRemaining((prev) => (prev == null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning, blockError]);

  useEffect(() => {
    if (timeRemaining !== 0 || !countdownRef.current || finishedRef.current) return;
    finishedRef.current = true;
    submitRef.current?.(answersRef.current);
  }, [timeRemaining]);

  // ── Initialisation: start test via POST endpoint ──
  const goToLogin = useEffectEvent(() => navigate('/login'));
  useEffect(() => {
    if (startAttempt) return undefined;
    let cancelled = false;

    const init = async () => {
      const token = getToken();
      if (!token) return goToLogin();

      try {
        const startUrl = isAi
          ? `/student/start-ai-test/${testId}`
          : `/student/start-test/${testId}`;

        const res = await apiClient.post(startUrl, {});
        if (cancelled) return;

        const next = readAttempt(res.data, {
          id: parseInt(testId),
          exam_start: res.data.exam_start ?? null,
          exam_end: res.data.exam_end ?? null,
        });
        const limit = next.timeLimitMinutes;
        const totalSec = next.totalSeconds;
        const interruptions = next.allowInterruptions;

        setAttempt(next);
        if (limit != null) {
          setTimeRemaining(next.timeRemaining);
          timeSpentRef.current = next.timeSpent;
        }

        if (next.answers) {
          setUserAnswers(next.answers);
          savedToServerRef.current = true;
          localStorage.removeItem(`test_progress_${testId}`);
          localStorage.removeItem(`test_restored_${testId}`);
        }

        if (interruptions !== false) {
          const savedProgress = localStorage.getItem(`test_progress_${testId}`);
          if (savedProgress && !cancelled) {
            const parsed = JSON.parse(savedProgress);
            const hoursSinceSave = (Date.now() - parsed.timestamp) / 3600000;
            const alreadyRestored = localStorage.getItem(`test_restored_${testId}`);
            if (!alreadyRestored && hoursSinceSave < 24 && Object.keys(parsed.answers || {}).length > 0) {
              localStorage.setItem(`test_restored_${testId}`, 'true');
              const shouldRestore = await confirm(
                'У вас есть сохранённый прогресс. Хотите продолжить с того места, где остановились?',
                { confirmLabel: 'Продолжить', cancelLabel: 'Начать заново' },
              );
              if (cancelled) return;
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
          localStorage.removeItem(`test_progress_${testId}`);
          localStorage.removeItem(`test_restored_${testId}`);
        }
      } catch (err) {
        if (cancelled) return;
        const detail = err.response?.data?.detail;
        const status = err.response?.status;
        if (status === 401) return goToLogin();
        setBlockError(typeof detail === 'string' ? detail : 'Не удалось начать тест. Попробуйте позже.');
      }
    };
    init();
    return () => { cancelled = true; };
  }, [testId, isAi, startAttempt, confirm]);

  // ── Current task ──
  const currentTask = test?.tasks?.[currentIdx];

  const fetchHint = async (taskId) => {
    if (hintUsed[taskId]) return;
    setHintUsed(prev => ({ ...prev, [taskId]: true }));
    setHintLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await apiClient.post(`/student/tasks/${taskId}/hint`,
        {}
      );
      if (res.data?.hint) {
        setHintData(prev => ({ ...prev, [taskId]: { hint: res.data.hint, geogebra: res.data.geogebra || null } }));
      }
    } catch {
      setHintData(prev => ({ ...prev, [taskId]: 'Не удалось загрузить подсказку. Попробуйте позже.' }));
    } finally {
      setHintLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleToggleAnswer = (taskId, index) => {
    const val = String(index + 1);
    const currentSelection = Array.isArray(userAnswers[taskId]) ? userAnswers[taskId] : [];
    if (currentSelection.includes(val)) {
      setUserAnswers({ ...userAnswers, [taskId]: currentSelection.filter(i => i !== val) });
    } else {
      setUserAnswers({ ...userAnswers, [taskId]: [...currentSelection, val] });
    }
  };

  const handleTextChange = (taskId, val) => {
    setUserAnswers({ ...userAnswers, [taskId]: val });
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

  const [isExiting, setIsExiting] = useState(false);
  const handleExitClick = async () => {
    saveCurrentDrawing();
    setIsExiting(true);
    try {
      await saveProgressToServer();
      localStorage.removeItem(`test_progress_${testId}`);
      localStorage.removeItem(`test_restored_${testId}`);
      navigate(getHomeRoute(getUserRole()));
    } catch {
      setIsExiting(false);
      notify('Не удалось сохранить прогресс. Проверьте интернет-соединение.');
    }
  };

  const handleRetakeInReport = async () => {
    if (!resultId) return;
    try {
      const retakeData = await retakeTest(resultId);
      const effectiveTestId = retakeData.test_id || testId;
      navigate(`/test/${effectiveTestId}?retake=1`, { replace: true, state: { startData: retakeData } });
    } catch (err) {
      const detail = err.response?.data?.detail;
      notify(typeof detail === 'string' ? detail : 'Не удалось начать пересдачу. Проверьте лимит попыток.');
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
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="max-w-md w-full bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
            {isExamNotStarted ? <CalendarIcon size={22} /> :
             isExamEnded || isTimeUp ? <Clock size={22} /> :
             isAttemptsExhausted ? <RotateCcw size={22} /> :
             <AlertTriangle size={22} />}
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {isExamNotStarted ? 'Экзамен ещё не начался' :
             isExamEnded ? 'Экзамен завершён' :
             isAttemptsExhausted ? 'Лимит попыток исчерпан' :
             isTimeUp ? 'Время вышло' :
             isDeactivated ? 'Тест отключён' :
             isPastDue ? 'Срок выполнения истёк' :
             isNoTasks ? 'В тесте нет заданий' :
             'Тест недоступен'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{blockError}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate(getHomeRoute(getUserRole()))}
              className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
            >
              К тестам
            </button>
            {isExamNotStarted && (
              <button
                onClick={() => navigate(`/result/${resultId}`)}
                className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
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
    <div className="h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#09090b]">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <Loader2 className="animate-spin text-zinc-400" size={28} />
    </div>
  );

  if (finished) {
    return (
      <TestResultReport
        test={test}
        userAnswers={userAnswers}
        drawings={drawings}
        onBack={() => navigate(getHomeRoute(getUserRole()))}
        onRetake={handleRetakeInReport}
      />
    );
  }

  if (submitError) {
    const isRetryable = submitError && !/Экзамен|исчерпали|Время вышло|деактивирован|Срок/i.test(submitError);
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="max-w-md w-full bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-8 text-center space-y-5">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle size={22} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Ошибка отправки</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{submitError}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate(getHomeRoute(getUserRole()))}
              className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              К тестам
            </button>
            {isRetryable && (
              <button
                onClick={() => { setSubmitError(null); submittedRef.current = false; doSubmit(userAnswers); }}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] pb-24">
      <div className={`${theoryOpen ? 'max-w-7xl' : 'max-w-2xl'} mx-auto p-4 md:p-8 space-y-6`}>
        {hasTimer && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border shadow-sm ${
            timerWarning
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
              : 'bg-white dark:bg-[#09090b] border-zinc-200 dark:border-zinc-800/60'
          }`}>
            <div className="flex items-center gap-3">
              <Clock size={18} className={timerWarning ? 'text-red-500' : 'text-zinc-400'} />
              <span className={`text-sm font-medium ${timerWarning ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                Осталось времени
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-semibold tabular-nums tracking-tight ${timerWarning ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {formatTime(timeRemaining)}
              </span>
              {theoryOpen && <ThemeToggle />}
            </div>
          </div>
        )}

        {!hasTimer && theoryOpen && (
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
        )}

        {!theoryOpen && attemptsLeft != null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800/60 rounded-2xl text-xs font-medium text-zinc-500 dark:text-zinc-400 shadow-sm">
            <RotateCcw size={12} />
            Попытка {attemptsUsed + 1} из {maxAttempts}{' '}
            {attemptsLeft <= 1 && (
              <span className="text-zinc-700 dark:text-zinc-200 ml-1">(последняя)</span>
            )}
          </div>
        )}

        {!theoryOpen && examStart && examEnd && !blockError && (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <CalendarIcon size={12} />
            Экзамен:{' '}
            {new Date(examStart).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' — '}
            {new Date(examEnd).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {!theoryOpen && !hasTimer && allowInterruptions && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} />
              Прогресс сохраняется на сервере — можно выйти и продолжить позже
            </div>
            <button
              onClick={handleExitClick}
              disabled={isExiting}
              className="flex items-center gap-1 px-3 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl text-xs font-medium transition disabled:opacity-50"
            >
              <LogOut size={12} />
              {isExiting ? 'Сохранение...' : 'Выйти'}
            </button>
          </div>
        )}
        {!theoryOpen && hasTimer && !allowInterruptions && (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <AlertTriangle size={12} />
            Тест нужно пройти за один присест. При выходе попытка будет потеряна.
          </div>
        )}

        {theoryOpen ? (
          <TestTheoryPanel />
        ) : (
          <>
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
              onToggleAnswer={(index) => handleToggleAnswer(currentTask?.id, index)}
              onTextChange={(val) => handleTextChange(currentTask?.id, val)}
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
                className="flex items-center gap-2 text-zinc-400 text-sm font-medium disabled:opacity-0 p-3 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <ChevronLeft size={18} /> Назад
              </button>

              {currentIdx === test.tasks.length - 1 ? (
                <button
                  onClick={handleSubmitClick}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium active:scale-95 transition-all disabled:opacity-40"
                >
                  {isSubmitting ? 'Отправка...' : 'Завершить работу'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx(v => v + 1)}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium active:scale-95 transition-all"
                >
                  Следующий шаг <ChevronRight size={18} />
                </button>
              )}
            </footer>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={theoryOpen ? closeTheory : openTheory}
        className={`fixed left-6 bottom-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#09090b] ${
          theoryOpen
            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
            : 'bg-white dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
        }`}
        title={theoryOpen ? 'Вернуться к тесту' : 'Открыть теорию'}
        aria-label={theoryOpen ? 'К тесту' : 'Теория'}
      >
        {theoryOpen ? <ClipboardList size={14} /> : <BookOpen size={14} />}
        {theoryOpen ? 'К тесту' : 'Теория'}
      </button>
    </div>
  );
}