import { ChevronLeft, ChevronRight, Clock, AlertTriangle, RotateCcw, Calendar as CalendarIcon, BookOpen, ClipboardList } from 'lucide-react';
import { ThemeToggle } from '../../shared/ui';
import TestProgressBar from './TestProgressBar';
import TestQuestionCard from './TestQuestionCard';
import TestTheoryPanel from './TestTheoryPanel';

function formatTime(seconds) {
  if (seconds == null || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Notice({ children, warn = false }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-medium ${
      warn
        ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
        : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800/60 dark:bg-[#09090b] dark:text-zinc-300'
    }`}>
      {children}
    </div>
  );
}

export default function TestSession({
  theoryOpen, closeTheory, openTheory,
  test, currentIdx, setCurrentIdx, userAnswers,
  timeRemaining, timerWarning, timeLimitMinutes,
  attemptsUsed, maxAttempts, examStart, examEnd,
  allowInterruptions,
  currentTask, onToggleAnswer, onTextChange,
  hintUsed, hintLoading, hintData, onFetchHint,
  showDrawing, onToggleDrawing, canvasRef, drawings,
  onDrawingSave, onDrawingDataChange, DrawingPadComponent,
  isSubmitting, onSubmit, finishLabel = 'Завершить работу',
}) {
  const hasTimer = timeLimitMinutes != null;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  const last = currentIdx === test.tasks.length - 1;

  return (
    <div className="min-h-screen bg-[#fafafa] pb-24 dark:bg-[#09090b]">
      <div className={`mx-auto space-y-4 p-4 md:p-6 ${theoryOpen ? 'max-w-7xl' : 'max-w-2xl'}`}>
        {hasTimer && (
          <Notice warn={timerWarning}>
            <Clock size={16} className={timerWarning ? 'text-red-500' : 'text-zinc-400'} />
            <span className="flex-1">Осталось времени</span>
            <span className={`text-lg font-semibold tabular-nums tracking-tight ${timerWarning ? '' : 'text-zinc-900 dark:text-zinc-100'}`}>{formatTime(timeRemaining)}</span>
            {theoryOpen && <ThemeToggle />}
          </Notice>
        )}
        {!hasTimer && theoryOpen && <div className="flex justify-end"><ThemeToggle /></div>}

        {!theoryOpen && attemptsLeft != null && (
          <Notice>
            <RotateCcw size={13} />
            Попытка {attemptsUsed + 1} из {maxAttempts}
            {attemptsLeft <= 1 && <span className="text-zinc-900 dark:text-zinc-100">последняя</span>}
          </Notice>
        )}
        {!theoryOpen && examStart && examEnd && (
          <Notice>
            <CalendarIcon size={13} />
            Экзамен {new Date(examStart).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            {' — '}
            {new Date(examEnd).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </Notice>
        )}
        {!theoryOpen && hasTimer && !allowInterruptions && (
          <Notice>
            <AlertTriangle size={13} />
            Тест нужно пройти за один присест. При выходе попытка будет потеряна.
          </Notice>
        )}

        {theoryOpen ? <TestTheoryPanel /> : (
          <>
            <TestProgressBar test={test} currentIdx={currentIdx} userAnswers={userAnswers} onNavigate={setCurrentIdx} />
            <TestQuestionCard
              currentTask={currentTask}
              currentIdx={currentIdx}
              userAnswers={userAnswers}
              onToggleAnswer={onToggleAnswer}
              onTextChange={onTextChange}
              hintUsed={hintUsed}
              hintLoading={hintLoading}
              hintData={hintData}
              onFetchHint={onFetchHint}
              showDrawing={showDrawing}
              onToggleDrawing={onToggleDrawing}
              canvasRef={canvasRef}
              drawings={drawings}
              onDrawingSave={onDrawingSave}
              onDrawingDataChange={onDrawingDataChange}
              DrawingPadComponent={DrawingPadComponent}
            />
            <footer className="flex items-center justify-between pt-2">
              <button type="button" disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)} className="inline-flex items-center gap-1.5 p-2 text-sm font-medium text-zinc-400 hover:text-zinc-800 disabled:opacity-0 dark:hover:text-zinc-100">
                <ChevronLeft size={18} /> Назад
              </button>
              {last ? (
                <button type="button" onClick={onSubmit} disabled={isSubmitting} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">
                  {isSubmitting ? 'Отправка...' : finishLabel}
                </button>
              ) : (
                <button type="button" onClick={() => setCurrentIdx(currentIdx + 1)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-950">
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
        className={`fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium shadow-lg ${
          theoryOpen
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
            : 'border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-200'
        }`}
      >
        {theoryOpen ? <ClipboardList size={14} /> : <BookOpen size={14} />}
        {theoryOpen ? 'К тесту' : 'Теория'}
      </button>
    </div>
  );
}
