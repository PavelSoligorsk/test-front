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
        className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] text-xl font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
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
            onClick={() => onToggleAnswer(i)}
            className={`p-5 text-left rounded-[1.8rem] border-2 transition-all flex justify-between items-center group relative overflow-hidden ${
              isSelected
                ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-md'
                : 'border-white bg-white hover:border-slate-200 text-slate-600 shadow-sm'
            }`}
          >
            <div className="flex gap-4 items-center z-10">
              <span className={`text-[11px] font-black italic ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>
                {currentVal}.
              </span>
              <div className="prose-sm pointer-events-none font-bold">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {opt}
                </ReactMarkdown>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all z-10 ${
              isSelected
                ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-200'
                : 'border-slate-100 group-hover:border-slate-300'
            }`}>
              {isSelected && <CheckCircle size={14} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
