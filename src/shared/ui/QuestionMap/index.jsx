import { useState } from 'react';
import { MapPin, X } from 'lucide-react';

export default function QuestionMap({ mode = 'result', tasks, details, userAnswers, currentIdx, onNavigate, onScroll }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const answeredCount = mode === 'test' && userAnswers
    ? Object.keys(userAnswers).filter(id => userAnswers[id]?.length > 0).length
    : 0;
  const totalCount = mode === 'test' ? (tasks?.length || 0) : (details?.length || 0);

  const correctCount = details?.filter(d => d.is_correct).length || 0;
  const wrongCount = details?.filter(d => !d.is_correct && d.user_answer !== "Нет ответа").length || 0;
  const skippedCount = details?.filter(d => d.user_answer === "Нет ответа").length || 0;

  const handleClick = (idx) => {
    if (onNavigate) onNavigate(idx);
    else if (onScroll) {
      const taskId = mode === 'test' ? tasks?.[idx]?.id : details?.[idx]?.task_id;
      if (taskId != null) onScroll(taskId);
    }
    setIsExpanded(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg"
        >
          <MapPin size={14} />
          Карта
          <span className="bg-white/15 dark:bg-zinc-950/10 px-2 py-0.5 rounded-full text-[11px] tabular-nums">
            {mode === 'test' ? `${answeredCount}/${totalCount}` : totalCount}
          </span>
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setIsExpanded(false)} />
          <div className="fixed bottom-24 right-6 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm z-50 w-80">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Навигация</span>
              <button type="button" onClick={() => setIsExpanded(false)} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {mode === 'test'
                ? tasks?.map((task, idx) => {
                    const hasAnswer = userAnswers?.[task.id] && (
                      Array.isArray(userAnswers[task.id])
                        ? userAnswers[task.id].length > 0
                        : userAnswers[task.id] !== ''
                    );
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleClick(idx)}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-medium tabular-nums transition-colors ${
                          isCurrent
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                            : hasAnswer
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })
                : details?.map((item, idx) => {
                    const hasNoAnswer = item.user_answer === "Нет ответа";
                    return (
                      <button
                        key={item.task_id}
                        type="button"
                        onClick={() => handleClick(idx)}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-medium tabular-nums transition-colors ${
                          hasNoAnswer
                            ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'
                            : item.is_correct
                              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
            </div>
            <div className="flex gap-4 mt-4 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex-wrap">
              {mode === 'test' ? (
                <>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md"></span> Отвечено ({answeredCount})</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-100 dark:bg-zinc-900 rounded-md"></span> Без ответа ({totalCount - answeredCount})</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-md"></span> Верно ({correctCount})</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 dark:bg-red-500/20 rounded-md"></span> Ошибки ({wrongCount})</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md"></span> Пропущено ({skippedCount})</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
