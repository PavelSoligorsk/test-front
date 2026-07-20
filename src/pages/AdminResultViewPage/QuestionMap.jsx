import React, { useState } from 'react';
import { MapPin, XCircle } from 'lucide-react';

export const QuestionMap = ({ details, onScroll }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const correctCount = details?.filter(d => d.is_correct).length || 0;
  const wrongCount = details?.filter(d => !d.is_correct && d.user_answer !== 'Нет ответа' && d.user_answer).length || 0;
  const skippedCount = details?.filter(d => d.user_answer === 'Нет ответа' || !d.user_answer).length || 0;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white border border-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20">
          <MapPin size={14} /> Карта <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px]">{details?.length || 0}</span>
        </button>
      </div>
      {isExpanded && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setIsExpanded(false)} />
          <div className="fixed bottom-24 right-6 bg-white border border-slate-200 rounded-[2rem] p-5 shadow-2xl z-50 w-80 animate-in slide-in-from-bottom-2 duration-200 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Навигация</span>
              <button onClick={() => setIsExpanded(false)} className="p-1 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"><XCircle size={14} /></button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {details?.map((item, idx) => {
                const hasNoAnswer = item.user_answer === 'Нет ответа' || !item.user_answer;
                return (
                  <button key={item.task_id} onClick={() => { onScroll(item.task_id); setIsExpanded(false); }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all hover:scale-110 ${
                      hasNoAnswer ? 'bg-slate-200 text-slate-400 hover:bg-slate-300' :
                      item.is_correct ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-[9px] font-bold text-slate-400 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 rounded-md"></span> Верно ({correctCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded-md"></span> Ошибки ({wrongCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-200 rounded-md"></span> Пропущено ({skippedCount})</span>
            </div>
          </div>
        </>
      )}
    </>
  );
};
