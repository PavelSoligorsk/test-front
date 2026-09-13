import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { TOPIC_STYLES } from './constants';

export default function TopicCard({ topic, onClick }) {
  const styles = TOPIC_STYLES[topic.topic] || { label: topic.label };

  return (
    <button
      type="button"
      onClick={() => onClick(topic)}
      className="group relative bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors text-left w-full overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
            <BookOpen size={18} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{styles.label}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{topic.sections_count} разделов</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">Изучить</span>
          <ArrowRight size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </button>
  );
}
