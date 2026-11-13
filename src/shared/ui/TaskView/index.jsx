import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

export function isSkippedAnswer(value, mode = 'loose') {
  if (value === 'Нет ответа') return true;
  if (mode === 'loose' && !value) return true;
  return false;
}

export function splitTaskOptions(options) {
  if (!options) return [];
  if (Array.isArray(options)) return options.map((opt) => String(opt).trim()).filter(Boolean);
  return String(options).split(';').map((opt) => opt.trim()).filter(Boolean);
}

export function indexOptionState(item, index) {
  const indexStr = String(index + 1);
  const correct = item.correct_answer ? String(item.correct_answer).split(/[;,]/).map((part) => part.trim()).filter(Boolean) : [];
  const chosen = item.user_answer && item.user_answer !== 'Нет ответа'
    ? String(item.user_answer).split(/[;,]/).map((part) => part.trim()).filter(Boolean)
    : [];
  const isCorrect = correct.includes(indexStr);
  const isChosen = chosen.includes(indexStr);
  if (isCorrect && isChosen) return 'both';
  if (isCorrect) return 'correct';
  if (isChosen) return 'wrong';
  return 'idle';
}

export function textOptionState(item, text) {
  if (item.correct_answer === text) return 'correct';
  if (item.user_answer === text && !item.is_correct) return 'wrong';
  return 'idle';
}

const optionClass = {
  both: 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  correct: 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  wrong: 'border-red-300 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 text-red-700 dark:text-red-300',
  idle: 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400',
};

function OptionMark({ state }) {
  if (state === 'both') return <CheckCircle2 size={16} className="text-emerald-500 shrink-0 self-center" />;
  if (state === 'correct') return <CheckCircle2 size={16} className="text-emerald-400/60 shrink-0 self-center" />;
  if (state === 'wrong') return <XCircle size={16} className="text-red-500 shrink-0 self-center" />;
  return null;
}

export function TaskOptions({ options, stateFor, showMarks = false, label = 'Варианты' }) {
  const list = splitTaskOptions(options);
  if (!list.length) return null;
  return (
    <div className="mb-4 space-y-2">
      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-2">{label}</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((opt, index) => {
          const state = stateFor(opt, index);
          return (
            <div key={`${index}-${opt}`} className={`p-3 rounded-xl border text-sm font-medium flex gap-2 ${optionClass[state] || optionClass.idle}`}>
              <span className="opacity-40 tabular-nums">{index + 1}.</span>
              <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
              {showMarks ? <OptionMark state={state} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DifficultyTicks({ level }) {
  const value = parseInt(level, 10) || 1;
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((step) => (
        <div
          key={step}
          className={`w-1 h-3 rounded-full ${step <= value ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}
        />
      ))}
    </div>
  );
}

function StatusPill({ skipped, correct }) {
  const className = skipped
    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
    : correct
      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
  return (
    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${className}`}>
      {skipped ? <AlertCircle size={12} /> : correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {skipped ? 'Пропущено' : correct ? 'Верно' : 'Ошибка'}
    </div>
  );
}

export function TaskFrame({
  taskId,
  index,
  difficulty,
  skipped,
  correct,
  points,
  headerExtra,
  children,
}) {
  return (
    <div data-task-id={taskId} className="bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
      <div className="p-4 md:p-5">
        <div className="flex justify-between items-start mb-3 gap-3">
          <div className={points ? 'flex gap-6' : undefined}>
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Вопрос №{index + 1}</span>
              {points ? (
                <span className="text-xs font-medium text-zinc-400">
                  Начислено: {points.earned || 0} / {points.max || 0} б.
                </span>
              ) : (
                <div className="flex gap-0.5 items-center">
                  <DifficultyTicks level={difficulty} />
                  <span className="text-[11px] font-medium text-zinc-400 ml-1.5">Ур. {difficulty}</span>
                </div>
              )}
            </div>
            {points ? (
              <div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Сложность</span>
                <DifficultyTicks level={difficulty} />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {headerExtra}
            <StatusPill skipped={skipped} correct={correct} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AnswerPair({ userAnswer, correctAnswer, skipped, correct, userLabel, correctLabel, corner = null }) {
  const userTone = skipped
    ? 'text-zinc-400'
    : correct
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-red-700 dark:text-red-400';
  const box = skipped
    ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800'
    : correct
      ? 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
      : 'bg-red-50/40 dark:bg-red-500/5 border-red-100 dark:border-red-500/20';
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className={`p-3 rounded-xl border ${box}`}>
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">{userLabel}</span>
        <div className={`text-sm font-medium ${userTone}`}>
          <MarkdownRenderer className="prose-sm">{userAnswer || '—'}</MarkdownRenderer>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
        <div className="mb-1 flex items-start justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{correctLabel}</span>
          {corner}
        </div>
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <MarkdownRenderer className="prose-sm">{correctAnswer}</MarkdownRenderer>
        </div>
      </div>
    </div>
  );
}

export function SolutionDisclosure({
  open,
  onToggle,
  showLabel = 'Посмотреть решение',
  hideLabel = 'Скрыть разбор',
  caption = 'Полный разбор задачи',
  children,
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open == null ? innerOpen : open;
  const toggle = () => {
    if (open == null) setInnerOpen((value) => !value);
    onToggle?.();
  };
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        className={`w-full py-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
          isOpen
            ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-950'
            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
        }`}
      >
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {isOpen ? hideLabel : showLabel}
      </button>
      {isOpen ? (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">{caption}</div>
          <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ResultTask({
  item,
  index,
  match = 'text',
  showMarks = false,
  showPoints = false,
  skipMode = 'loose',
  userLabel = 'Ваш ответ',
  correctLabel = 'Правильный ответ',
  optionsLabel = 'Варианты',
  headerExtra = null,
  answerCorner = null,
  beforeSolution = null,
  solutionShowLabel,
  solutionHideLabel,
  solutionCaption,
  solutionOpen,
  onToggleSolution,
}) {
  const skipped = isSkippedAnswer(item.user_answer, skipMode);
  const stateFor = match === 'index'
    ? (_opt, optionIndex) => indexOptionState(item, optionIndex)
    : (opt) => textOptionState(item, opt);

  return (
    <TaskFrame
      taskId={item.task_id}
      index={index}
      difficulty={item.difficulty}
      skipped={skipped}
      correct={item.is_correct}
      points={showPoints ? { earned: item.points_earned, max: item.max_task_points } : null}
      headerExtra={headerExtra}
    >
      <div className="mb-4 text-sm text-zinc-800 dark:text-zinc-200 leading-snug [&_.katex-display]:my-2">
        <MarkdownRenderer className="prose-sm">{item.content}</MarkdownRenderer>
      </div>
      <TaskOptions options={item.options} stateFor={stateFor} showMarks={showMarks} label={optionsLabel} />
      <AnswerPair
        userAnswer={item.user_answer}
        correctAnswer={item.correct_answer}
        skipped={skipped}
        correct={item.is_correct}
        userLabel={userLabel}
        correctLabel={correctLabel}
        corner={answerCorner}
      />
      {beforeSolution}
      {item.solution ? (
        <SolutionDisclosure
          open={solutionOpen}
          onToggle={onToggleSolution}
          showLabel={solutionShowLabel}
          hideLabel={solutionHideLabel}
          caption={solutionCaption}
        >
          <MarkdownRenderer className="prose-sm">{item.solution}</MarkdownRenderer>
        </SolutionDisclosure>
      ) : null}
    </TaskFrame>
  );
}
