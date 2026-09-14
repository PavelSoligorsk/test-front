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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#09090b]">
        <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] pb-20">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} /> Назад в админку
        </button>

        <header className="bg-white dark:bg-[#09090b] p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {data.test_title.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim()}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {data.user.first_name} {data.user.last_name} · Просмотр (Админ)
            </p>
          </div>
          <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-6 py-4 rounded-2xl text-center">
            <div className="text-2xl font-semibold tabular-nums tracking-tight">{data.total_points} / {data.max_points}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">баллов</div>
          </div>
        </header>

        {data.difficulty_stats && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <BarChart3 size={14} className="text-zinc-400" />
              <h2 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Аналитика по сложностям</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-4">
              {Object.entries(data.difficulty_stats).map(([level, stat]) => stat.total > 0 && (
                <DifficultyBadge key={level} level={parseInt(level)} correct={stat.correct} total={stat.total} />
              ))}
            </div>
          </section>
        )}

        <div className="space-y-6">
          {sortedDetails.map((item, idx) => (
            <ResultTaskCard key={item.task_id} item={item} index={idx} />
          ))}
        </div>
      </div>

      <QuestionMap
        details={sortedDetails}
        onScroll={(taskId) => {
          const el = document.querySelector(`[data-task-id="${taskId}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />
    </div>
  );
}
