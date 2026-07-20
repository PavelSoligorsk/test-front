import { BarChart3 } from 'lucide-react';
import { DifficultyBadge } from '../../shared/ui';

export default function DifficultyStats({ difficultyStats }) {
  if (!difficultyStats || !Object.values(difficultyStats).some(stat => stat.total > 0)) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <BarChart3 size={14} className="text-slate-400" />
        <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Аналитика по сложностям</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-4">
        {Object.entries(difficultyStats).map(([level, stat]) =>
          stat.total > 0 && (
            <DifficultyBadge key={level} level={parseInt(level)} correct={stat.correct} total={stat.total} />
          )
        )}
      </div>
    </section>
  );
}
