import React from 'react';
import { BookOpen, Users, Bot, Clock, LayoutGrid, Target, ArrowRight, AlertCircle, Check, RotateCcw, Calendar } from 'lucide-react';

const TYPE_META = {
  static: { icon: BookOpen, label: 'Автосборка' },
  custom: { icon: Users, label: 'От учителя' },
  ai: { icon: Bot, label: 'AI' },
};

export default function TestCard({ test, type, onStart, disabled }) {
  const meta = TYPE_META[type] || TYPE_META.static;
  const Icon = meta.icon;

  return (
    <div
      onClick={() => !disabled && onStart?.(test)}
      className={`group relative bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm transition-colors overflow-hidden ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
      }`}
    >
      <div className="p-5 md:p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
            <Icon size={18} strokeWidth={2} />
          </div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-1 rounded-md">
            {meta.label}
          </span>
        </div>
        <div className="space-y-1 mb-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight line-clamp-2">
            {test.title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim() || 'Без названия'}
          </h3>
          {test.subject && <p className="text-xs text-zinc-500 dark:text-zinc-400">{test.subject}</p>}
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
            <LayoutGrid size={12} className="text-zinc-400" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">{test.tasks_count ?? test.tasks?.length ?? 0} задач</span>
          </div>
          {(test.time_limit_minutes != null) && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
              <Clock size={12} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">{test.time_limit_minutes} мин</span>
            </div>
          )}
          {test.duration && !test.time_limit_minutes && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
              <Clock size={12} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">{test.duration} мин</span>
            </div>
          )}
          {test.max_attempts != null && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
              <RotateCcw size={12} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">×{test.max_attempts}</span>
            </div>
          )}
          {test.difficulty && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
              <Target size={12} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ур. {test.difficulty}</span>
            </div>
          )}
        </div>
        {test.due_date && !test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 rounded-xl">
            <AlertCircle size={12} className="text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">До {new Date(test.due_date).toLocaleDateString()}</span>
          </div>
        )}
        {test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 px-3 py-2 rounded-xl">
            <Check size={12} className="text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Выполнено</span>
          </div>
        )}
        {test.exam_start && test.exam_end && !test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-3 py-2 rounded-xl">
            <Calendar size={12} className="text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {new Date(test.exam_start).toLocaleDateString()} – {new Date(test.exam_end).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
            {disabled ? 'Недоступно' : test.started ? 'Продолжить' : 'Начать'}
          </span>
          <ArrowRight size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </div>
  );
}
