export default function DifficultyStats({ difficultyStats }) {
  if (!difficultyStats || !Object.values(difficultyStats).some(stat => stat.total > 0)) return null;

  return (
    <section className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">По сложности</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Доля верных ответов на каждом уровне</p>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {Object.entries(difficultyStats).map(([level, stat]) => {
          if (!stat.total) return null;
          const pct = Math.round((stat.correct / stat.total) * 100);
          return (
            <div key={level} className="px-6 md:px-8 py-4 flex items-center gap-4">
              <span className="w-20 text-sm font-medium text-zinc-600 dark:text-zinc-300 shrink-0">Уровень {level}</span>
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900 dark:bg-white rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 w-12 text-right">{pct}%</span>
              <span className="text-xs text-zinc-400 tabular-nums w-16 text-right hidden sm:block">{stat.correct} / {stat.total}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
