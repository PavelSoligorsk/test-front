import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TOPIC_STYLES } from './constants';

export default function TopicCard({ topic, onClick }) {
  const styles = TOPIC_STYLES[topic.topic] || { gradient: 'from-slate-500 to-slate-600', icon: '📚', label: topic.label };

  return (
    <button onClick={() => onClick(topic)}
      className="group relative bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-xl transition-all overflow-hidden text-left w-full">
      <div className={`h-1.5 bg-gradient-to-r ${styles.gradient}`} />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${styles.gradient} rounded-xl flex items-center justify-center text-white shadow-lg text-2xl`}>
            {styles.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase">{styles.label}</h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">{topic.sections_count} разделов</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-700">
          <span className="text-[9px] font-black uppercase text-slate-400">Изучить</span>
          <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}

