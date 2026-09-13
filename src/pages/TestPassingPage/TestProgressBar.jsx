import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuestionMap, ThemeToggle } from '../../shared/ui';

export default function TestProgressBar({ test, currentIdx, userAnswers, onNavigate }) {
  const navigate = useNavigate();

  return (
    <header className="flex justify-between items-center bg-white dark:bg-[#09090b] p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Вопрос</span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
            {currentIdx + 1}
            <span className="text-zinc-300 dark:text-zinc-600 font-medium mx-1">/</span>
            {test?.tasks?.length}
          </span>
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
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}
