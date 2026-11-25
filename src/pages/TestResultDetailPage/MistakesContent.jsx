import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import apiClient from '../../shared/api';
import { useNotify } from '../../shared/ui';
import { fetchMistakes, submitMistakes } from '../StudentDashboardPage/api';
import { sortExamTasks } from '../../shared/lib/examOrder';
import DrawingPad from '../../components/DrawingPad';
import AttemptGate from '../TestPassingPage/AttemptGate';
import TestSession from '../TestPassingPage/TestSession';

function wireAnswer(value) {
  if (!Array.isArray(value)) return value;
  const items = [...value].sort((a, b) => String(a).localeCompare(String(b), 'ru', { numeric: true }));
  return items.length <= 1 ? (items[0] ?? '') : items;
}

function seedAnswer(task) {
  const value = task.user_answer;
  if (task.is_open_answer) return value == null || value === 'Нет ответа' ? '' : String(value);
  if (Array.isArray(value)) return value.map(String);
  if (value == null || value === 'Нет ответа') return [];
  const text = String(value);
  return text.includes(',') ? text.split(',').map((part) => part.trim()).filter(Boolean) : text;
}

export default function MistakesContent() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [hintData, setHintData] = useState({});
  const [hintLoading, setHintLoading] = useState({});
  const [hintUsed, setHintUsed] = useState({});
  const [drawings, setDrawings] = useState({});
  const [showDrawing, setShowDrawing] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchMistakes(resultId)
      .then((data) => {
        if (cancelled) return;
        const tasks = sortExamTasks(data.tasks || []);
        const seeded = {};
        tasks.forEach((task) => { seeded[task.id] = seedAnswer(task); });
        setAnswers(seeded);
        setTest({ id: data.test_id, title: data.test_title, tasks });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || 'Не удалось открыть ошибки.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resultId]);

  const task = test?.tasks?.[index];

  const fetchHint = async (taskId) => {
    if (hintUsed[taskId]) return;
    setHintUsed((prev) => ({ ...prev, [taskId]: true }));
    setHintLoading((prev) => ({ ...prev, [taskId]: true }));
    try {
      const res = await apiClient.post(`/student/tasks/${taskId}/hint`, {});
      setHintData((prev) => ({ ...prev, [taskId]: { hint: res.data?.hint, geogebra: res.data?.geogebra || null } }));
    } catch (err) {
      setHintData((prev) => ({ ...prev, [taskId]: err.response?.data?.detail || 'Не удалось загрузить подсказку.' }));
    } finally {
      setHintLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload = (test?.tasks || []).map((item) => ({
      task_id: item.id,
      user_answer: wireAnswer(answers[item.id]),
    }));
    try {
      const data = await submitMistakes(resultId, payload);
      notify(data.remaining_mistakes ? `Исправлено: ${data.fixed}. Осталось ошибок: ${data.remaining_mistakes}.` : 'Ошибок больше нет.');
      navigate(`/result/${resultId}`, { replace: true });
    } catch (err) {
      notify(err.response?.data?.detail || 'Не удалось сдать исправления.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] dark:bg-[#09090b]">
        <Loader2 className="animate-spin text-zinc-400" size={28} />
      </div>
    );
  }

  if (error || !test?.tasks?.length) {
    return (
      <AttemptGate
        title="Работа над ошибками"
        message={error || 'Ошибок нет'}
        actions={(
          <button type="button" onClick={() => navigate(`/result/${resultId}`)} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950">
            К результату
          </button>
        )}
      />
    );
  }

  return (
    <TestSession
      theoryOpen={theoryOpen}
      openTheory={() => setTheoryOpen(true)}
      closeTheory={() => setTheoryOpen(false)}
      test={test}
      currentIdx={index}
      setCurrentIdx={setIndex}
      userAnswers={answers}
      timeRemaining={null}
      timerWarning={false}
      timeLimitMinutes={null}
      attemptsUsed={0}
      maxAttempts={null}
      examStart={null}
      examEnd={null}
      allowInterruptions
      currentTask={task}
      onToggleAnswer={(optionIndex) => {
        const value = String(optionIndex + 1);
        const current = Array.isArray(answers[task.id]) ? answers[task.id] : [];
        const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        setAnswers({ ...answers, [task.id]: next });
      }}
      onTextChange={(value) => setAnswers({ ...answers, [task.id]: value })}
      hintUsed={hintUsed}
      hintLoading={hintLoading}
      hintData={hintData}
      onFetchHint={fetchHint}
      showDrawing={showDrawing}
      onToggleDrawing={(taskId) => setShowDrawing((prev) => ({ ...prev, [taskId]: !prev[taskId] }))}
      canvasRef={null}
      drawings={drawings}
      onDrawingSave={(taskId, dataUrl) => setDrawings((prev) => ({ ...prev, [taskId]: dataUrl }))}
      onDrawingDataChange={(taskId, dataUrl) => setDrawings((prev) => ({ ...prev, [taskId]: dataUrl }))}
      DrawingPadComponent={DrawingPad}
      isSubmitting={submitting}
      onSubmit={submit}
      finishLabel="Сдать исправления"
    />
  );
}
