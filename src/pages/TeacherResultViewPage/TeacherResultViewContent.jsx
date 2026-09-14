import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../../shared/api';
import { MarkdownRenderer, DifficultyBadge, QuestionMap } from '../../shared/ui';

export default function TeacherResultViewContent() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSolutions, setOpenSolutions] = useState({});

  const toggleSolution = (id) => setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
        const token = session?.token || session?.access_token;
        const res = await axios.get(`${API_BASE}/teacher/results/${resultId}`, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
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
      return (a.task_id || 0) - (b.task_id || 0);
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
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} /> Назад в учительскую
        </button>

        <header className="bg-white dark:bg-[#09090b] p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {data.test_title.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim()}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {data.user.first_name} {data.user.last_name}
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
              {Object.entries(data.difficulty_stats).map(([level, stat]) =>
                stat.total > 0 && (
                  <DifficultyBadge key={level} level={parseInt(level)} correct={stat.correct} total={stat.total} />
                )
              )}
            </div>
          </section>
        )}

        <div className="space-y-6">
          {sortedDetails.map((item, idx) => {
            const hasNoAnswer = item.user_answer === 'Нет ответа' || !item.user_answer;
            const isSolutionOpen = openSolutions[item.task_id];
            const diff = parseInt(item.difficulty) || 1;
            return (
              <div
                key={item.task_id}
                data-task-id={item.task_id}
                className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden"
              >
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-6 gap-4">
                    <div className="flex gap-6">
                      <div>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Вопрос №{idx + 1}</span>
                        <span className="text-xs font-medium text-zinc-400">
                          Начислено: {item.points_earned || 0} / {item.max_task_points || 0} б.
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Сложность</span>
                        <div className="flex gap-0.5 items-center">
                          {[1, 2, 3, 4, 5].map((step) => (
                            <div
                              key={step}
                              className={`w-1 h-3 rounded-full ${
                                step <= diff ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                      hasNoAnswer
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        : item.is_correct
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {hasNoAnswer ? <AlertCircle size={12} /> : item.is_correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {hasNoAnswer ? 'Пропущено' : item.is_correct ? 'Верно' : 'Ошибка'}
                    </div>
                  </div>

                  <div className="mb-8 text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                    <MarkdownRenderer>{item.content}</MarkdownRenderer>
                  </div>

                  {item.options && (
                    <div className="mb-8 space-y-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-3">Варианты</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(Array.isArray(item.options) ? item.options : item.options.split(';')).map(opt => opt.trim()).filter(opt => opt.length > 0).map((opt, i) => {
                          const isUserChoice = item.user_answer === opt;
                          const isCorrectChoice = item.correct_answer === opt;
                          let cardStyle = 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400';
                          if (isCorrectChoice) cardStyle = 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
                          else if (isUserChoice && !item.is_correct) cardStyle = 'border-red-300 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 text-red-700 dark:text-red-300';
                          return (
                            <div key={i} className={`p-4 rounded-2xl border text-sm font-medium flex gap-3 ${cardStyle}`}>
                              <span className="opacity-40 tabular-nums">{i + 1}.</span>
                              <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`p-5 rounded-2xl border ${
                      hasNoAnswer
                        ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800'
                        : item.is_correct
                          ? 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
                          : 'bg-red-50/40 dark:bg-red-500/5 border-red-100 dark:border-red-500/20'
                    }`}>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">Ответ ученика</span>
                      <div className={`text-sm font-medium ${
                        hasNoAnswer
                          ? 'text-zinc-400'
                          : item.is_correct
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}>
                        <MarkdownRenderer>{item.user_answer || '—'}</MarkdownRenderer>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">Эталонный ответ</span>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        <MarkdownRenderer>{item.correct_answer}</MarkdownRenderer>
                      </div>
                    </div>
                  </div>

                  {item.solution && (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => toggleSolution(item.task_id)}
                        className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
                          isSolutionOpen
                            ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-950'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                        }`}
                      >
                        {isSolutionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isSolutionOpen ? 'Скрыть разбор' : 'Показать решение'}
                      </button>
                      {isSolutionOpen && (
                        <div className="p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">Решение</div>
                          <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                            <MarkdownRenderer>{item.solution}</MarkdownRenderer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
