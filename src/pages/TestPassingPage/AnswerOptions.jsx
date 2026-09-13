import { CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

export default function AnswerOptions({ task, userAnswers, onToggleAnswer, onTextChange }) {
  if (!task) return null;

  if (task.is_open_answer) {
    return (
      <input
        key={task.id}
        autoFocus
        className="w-full p-5 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl text-lg font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 shadow-sm placeholder:text-zinc-400"
        placeholder="Введите значение..."
        value={userAnswers[task.id] || ''}
        onChange={(e) => onTextChange(e.target.value)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {task.options?.map((opt, i) => {
        const currentVal = String(i + 1);
        const isSelected = Array.isArray(userAnswers[task.id])
          ? userAnswers[task.id].includes(currentVal)
          : userAnswers[task.id] === currentVal;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onToggleAnswer(i)}
            className={`p-5 text-left rounded-3xl border transition-colors flex justify-between items-center group ${
              isSelected
                ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className="flex gap-4 items-center z-10">
              <span className={`text-sm font-medium tabular-nums ${isSelected ? 'text-white/60 dark:text-zinc-500' : 'text-zinc-400'}`}>
                {currentVal}.
              </span>
              <div className="prose-sm pointer-events-none font-medium">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                  {opt}
                </ReactMarkdown>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 z-10 ${
              isSelected
                ? 'bg-white dark:bg-zinc-950 border-white dark:border-zinc-950'
                : 'border-zinc-200 dark:border-zinc-700 group-hover:border-zinc-400'
            }`}>
              {isSelected && <CheckCircle size={14} className="text-zinc-900 dark:text-white" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
