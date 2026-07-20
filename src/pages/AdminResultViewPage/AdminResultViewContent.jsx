import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { fetchAdminResult } from '../AdminDashboardPage/api';
import { MarkdownRenderer, DifficultyBadge, QuestionMap } from '../../shared/ui';
import ResultTaskCard from './ResultTaskCard';

export default function AdminResultViewContent() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const resData = await fetchAdminResult(resultId);
        setData(resData);
      } catch (err) { console.error('Ошибка при получении данных администратором:', err); } finally { setLoading(false); }
    };
    fetchResult();
  }, [resultId]);

  const sortedDetails = useMemo(() => {
    if (!data?.details) return [];
    return [...data.details].sort((a, b) => {
      const aType = a.max_task_points > 1 ? 1 : 0;
      const bType = b.max_task_points > 1 ? 1 : 0;
      if (aType !== bType) return aType - bType;
      const aDiff = parseInt(a.difficulty) || 0;
      const bDiff = parseInt(b.difficulty) || 0;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return (a.id || a.task_id || 0) - (b.id || b.task_id || 0);
    });
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="text-center font-black uppercase tracking-widest text-slate-400 animate-pulse">Загрузка данных...</div></div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase text-[10px] tracking-widest">
          <ArrowLeft size={14} /> Назад
        </button>

        {/* Header */}
        <header className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {data.test_title.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim()}
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase mt-3 tracking-[0.2em]">
              {data.user.first_name} {data.user.last_name} • Просмотр (Админ)
            </p>
          </div>
          <div className="bg-slate-950 text-white px-10 py-7 rounded-[2.5rem] text-center shadow-xl shadow-slate-200">
            <div className="text-4xl font-black tabular-nums">{data.total_points} / {data.max_points}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Баллов набрано</div>
          </div>
        </header>

        {/* Difficulty stats */}
        {data.difficulty_stats && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <BarChart3 size={14} className="text-slate-400" />
              <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Аналитика по сложностям</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-4">
              {Object.entries(data.difficulty_stats).map(([level, stat]) => stat.total > 0 && (
                <DifficultyBadge key={level} level={parseInt(level)} correct={stat.correct} total={stat.total} />
              ))}
            </div>
          </section>
        )}

        {/* Task cards */}
        <div className="space-y-6">
          {sortedDetails.map((item, idx) => (
            <ResultTaskCard key={item.task_id} item={item} index={idx} />
          ))}
        </div>
      </div>

      {/* Question map */}
      <QuestionMap details={sortedDetails} onScroll={(taskId) => { const el = document.querySelector(`[data-task-id="${taskId}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
    </div>
  );
}
