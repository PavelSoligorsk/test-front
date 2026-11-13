import { ChevronRight } from 'lucide-react';

export default function NavTile({ title, meta, index, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors text-left ${index == null ? 'p-5' : 'p-4'}`}
    >
      <div className="flex items-center gap-3">
        {index != null ? (
          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-sm shrink-0 tabular-nums">
            {index}
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{title}</p>
          {meta ? <div className="mt-0.5 text-xs text-zinc-500">{meta}</div> : null}
        </div>
        <ChevronRight size={index == null ? 18 : 16} className="text-zinc-300 shrink-0" />
      </div>
    </button>
  );
}
