import React from 'react';
import { BookOpen, Users, Bot, Clock, LayoutGrid, Target, ArrowRight, AlertCircle, Check } from 'lucide-react';

const TYPE_STYLES = {
  static: { gradient: 'from-blue-600 to-blue-700', icon: BookOpen, label: 'АВТОСБОРКА', badge: 'bg-blue-100 text-blue-600', accent: 'blue', accentBg: 'bg-blue-50' },
  custom: { gradient: 'from-emerald-600 to-teal-700', icon: Users, label: 'ОТ УЧИТЕЛЯ', badge: 'bg-emerald-100 text-emerald-600', accent: 'emerald', accentBg: 'bg-emerald-50' },
  ai: { gradient: 'from-purple-600 to-violet-700', icon: Bot, label: 'AI ГЕНЕРАЦИЯ', badge: 'bg-purple-100 text-purple-600', accent: 'purple', accentBg: 'bg-purple-50' },
};

export default function TestCard({ test, type, onStart, disabled }) {
  const styles = TYPE_STYLES[type] || TYPE_STYLES.static;
  const Icon = styles.icon;

  return (
    <div onClick={() => !disabled && onStart?.(test)}
      className={`group relative bg-white dark:bg-slate-800 rounded-[2rem] border-2 transition-all overflow-hidden ${disabled ? 'border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed' : 'border-slate-100 dark:border-slate-700 hover:shadow-2xl cursor-pointer hover:-translate-y-1'}`}>
      <div className={`h-1.5 bg-gradient-to-r ${styles.gradient}`} />
      <div className="p-5 md:p-6">
        <div className="flex justify-between items-start mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${styles.gradient} rounded-xl flex items-center justify-center text-white shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform`}>
            <Icon size={18} />
          </div>
          <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-lg ${styles.badge} tracking-wider`}>{styles.label}</span>
        </div>
        <div className="space-y-1 mb-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-2">
            {test.title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim() || 'Без названия'}
          </h3>
          {test.subject && <p className="text-[9px] font-bold text-slate-400 uppercase">{test.subject}</p>}
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className={`flex items-center gap-1.5 ${styles.accentBg} px-2.5 py-1.5 rounded-lg`}>
            <LayoutGrid size={12} /> <span className="text-[9px] font-black uppercase text-slate-600">{test.tasks?.length || 0} задач</span>
          </div>
          {test.duration && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg">
              <Clock size={12} className="text-slate-400" /> <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">{test.duration} мин</span>
            </div>
          )}
          {test.difficulty && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg">
              <Target size={12} /> <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">Ур. {test.difficulty}</span>
            </div>
          )}
        </div>
        {test.due_date && !test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
            <AlertCircle size={12} className="text-amber-500" />
            <span className="text-[9px] font-black text-amber-700 uppercase">До {new Date(test.due_date).toLocaleDateString()}</span>
          </div>
        )}
        {test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
            <Check size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-700 uppercase">Выполнено</span>
          </div>
        )}
        <div className="pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] group-hover:tracking-[0.25em] transition-all`}>
            {disabled ? 'Недоступно' : test.started ? 'Продолжить' : 'Начать'}
          </span>
          <ArrowRight size={14} className="transform group-hover:translate-x-2 transition-transform" />
        </div>
      </div>
    </div>
  );
}

