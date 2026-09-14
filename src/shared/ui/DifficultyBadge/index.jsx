export default function DifficultyBadge({ level, correct, total }) {
  const percentage = Math.round((correct / total) * 100);

  return (
    <div className="flex-1 bg-white dark:bg-[#09090b] p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm min-w-[120px]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-1 h-2 rounded-full ${
                step <= level ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-zinc-400">Ур. {level}</span>
      </div>
      <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 leading-none mb-1 tabular-nums tracking-tight">
        {percentage}%
      </div>
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {correct} из {total} верно
      </div>
      <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full bg-zinc-900 dark:bg-white transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
