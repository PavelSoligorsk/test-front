import React from 'react';

export const DifficultyBadge = ({ level, correct, total }) => {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="flex-1 bg-white dark:bg-[#09090b] p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col items-center justify-center min-w-[120px] transition-transform hover:scale-105">
      <div className="flex gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i < level ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'
            }`}
          />
        ))}
      </div>
      <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{percent}%</div>
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Ур. {level} ({correct}/{total})</div>
    </div>
  );
};
