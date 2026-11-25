import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuestionMap, ThemeToggle } from '../../shared/ui';
import { rememberedStudentPath } from '../StudentDashboardPage/studentPaths';

export default function TestProgressBar({ test, currentIdx, userAnswers, onNavigate }) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
      <div className="flex min-w-0 items-center gap-5">
        <div className="shrink-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Вопрос</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
            {currentIdx + 1}
            <span className="mx-1 font-medium text-zinc-300 dark:text-zinc-600">/</span>
            {test?.tasks?.length}
          </p>
        </div>
        <QuestionMap
          mode="test"
          tasks={test?.tasks}
          userAnswers={userAnswers}
          currentIdx={currentIdx}
          onNavigate={onNavigate}
        />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => navigate(rememberedStudentPath())}
          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          aria-label="Выйти к дашборду"
          title="Выйти"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}
