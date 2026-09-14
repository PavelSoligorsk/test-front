import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { primaryBtnClass } from '../../shared/ui';

export const TaskMap = ({ tasks, onScroll }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedTasks = tasks?.slice().sort((a, b) => {
    if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
    return (a.difficulty || 0) - (b.difficulty || 0);
  });

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button type="button" onClick={() => setIsExpanded(!isExpanded)} className={`${primaryBtnClass} shadow-lg`}>
          <MapPin size={14} /> Карта
          <span className="bg-white/20 dark:bg-zinc-900/20 px-2 py-0.5 rounded-lg text-xs tabular-nums">
            {sortedTasks?.length || 0}
          </span>
        </button>
      </div>
      {isExpanded && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setIsExpanded(false)} />
          <div className="fixed bottom-24 right-6 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm z-50 w-80 animate-in slide-in-from-bottom-2 duration-200 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Задания ({sortedTasks?.length || 0})
              </span>
              <button type="button" onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sortedTasks?.map((task, idx) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => { onScroll(task.id); setIsExpanded(false); }}
                  className="aspect-square rounded-xl flex items-center justify-center text-xs font-semibold tabular-nums transition-colors bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950"
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};
