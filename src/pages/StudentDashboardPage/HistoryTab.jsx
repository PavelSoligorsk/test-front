import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Search, Calendar, RotateCcw } from 'lucide-react';

export default function HistoryTab({ filteredHistory, searchTerm, setSearchTerm, onRetake }) {
  const navigate = useNavigate();

  // Фильтрация тестов после 2000 года
  const validHistory = filteredHistory.filter(res => {
    const completedDate = new Date(res.completed_at);
    return completedDate.getFullYear() >= 2000;
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-black uppercase italic flex items-center gap-3 text-slate-950 dark:text-white">
          <History size={22} /> История решений
        </h2>
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="ПОИСК..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border-none rounded-xl text-[10px] font-black uppercase dark:text-white" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Тест</th>
              <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Балл</th>
              <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Дата</th>
              <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {validHistory.length > 0 ? validHistory.map(res => (
              <tr key={res.id} onClick={() => navigate(`/result/${res.id}`)}
                className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group">
                <td className="px-6 md:px-8 py-5 font-black uppercase text-slate-800 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {res.test_title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim()}
                </td>
                <td className="px-6 md:px-8 py-5 text-center font-black italic text-lg text-blue-600">{res.total_points}</td>
                <td className="px-6 md:px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">
                  <div className="flex items-center gap-2"><Calendar size={12} /> {new Date(res.completed_at).toLocaleDateString()}</div>
                </td>
                <td className="px-6 md:px-8 py-5 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetake(res.id, res.test_id); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase hover:bg-blue-100 transition-all border border-blue-100"
                    title="Пересдать тест"
                  >
                    <RotateCcw size={11} /> Пересдать
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center py-12 text-slate-300 font-black uppercase text-xs">История пуста</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}