export default function DifficultyBadge({ level, correct, total }) {
  const percentage = Math.round((correct / total) * 100);
  
  const getColor = (lvl) => {
    if (lvl >= 4) return 'bg-red-500';
    if (lvl >= 3) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm min-w-[120px]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className={`w-1 h-2 rounded-full ${step <= level ? getColor(level) : 'bg-slate-100'}`} />
          ))}
        </div>
        <span className="text-[10px] font-black text-slate-300 uppercase italic">LVL {level}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 leading-none mb-1">{percentage}%</div>
      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
        {correct} ИЗ {total} ВЕРНО
      </div>
      <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
        <div className={`h-full ${getColor(level)} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
