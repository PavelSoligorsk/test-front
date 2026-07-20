import React from 'react';

export const DifficultyBadge = ({ level, correct, total }) => {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="flex-1 bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center min-w-[120px] transition-transform hover:scale-105">
      <div className="flex gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < level ? 'bg-blue-600' : 'bg-slate-100'}`} />
        ))}
      </div>
      <div className="text-2xl font-black text-slate-950">{percent}%</div>
      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Lvl {level} ({correct}/{total})</div>
    </div>
  );
};
