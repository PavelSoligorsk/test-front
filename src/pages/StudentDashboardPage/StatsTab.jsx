import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../../shared/config';
import { 
  BarChart3, 
  Target, 
  Layers, 
  RefreshCw, 
  Flame, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

const CHART_GRADIENTS = {
  1: 'from-emerald-400 to-emerald-500 shadow-emerald-500/40',
  2: 'from-lime-400 to-lime-500 shadow-lime-500/40',
  3: 'from-amber-400 to-amber-500 shadow-amber-500/40',
  4: 'from-orange-400 to-orange-500 shadow-orange-500/40',
  5: 'from-red-400 to-red-500 shadow-red-500/40',
};

const CHART_TEXT = {
  1: 'text-emerald-600 dark:text-emerald-400',
  2: 'text-lime-600 dark:text-lime-400',
  3: 'text-amber-600 dark:text-amber-400',
  4: 'text-orange-600 dark:text-orange-400',
  5: 'text-red-600 dark:text-red-400',
};

const getToken = () => {
  try {
    const s = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return s?.token || s?.access_token || null;
  } catch {
    return null;
  }
};

export default function StatsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');
  const [expandedTopics, setExpandedTopics] = useState({});

  const PERIODS = [
    { k: 'all', l: 'Всё время' },
    { k: 'year', l: 'Год' },
    { k: 'month', l: 'Месяц' },
    { k: 'week', l: 'Неделя' },
  ];

  const fetchStats = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/student/me/stats`, {
        params: { period: p },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setData(res.data);
      setLoaded(true);
    } catch (err) {
      setError('Ошибка загрузки');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded) fetchStats(period);
  }, [loaded, period, fetchStats]);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    fetchStats(p);
  };

  const toggleTopic = (index) => {
    setExpandedTopics(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!loaded && loading) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4 shadow-sm border border-slate-100/80 dark:border-slate-700">
          <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Загрузка дашборда...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] p-16 flex flex-col items-center text-center gap-6 shadow-sm border border-slate-100/80 dark:border-slate-700">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-2">
            <TrendingDown size={32} />
          </div>
          <p className="text-xs md:text-sm font-black uppercase text-slate-500 tracking-widest">{error}</p>
          <button onClick={() => fetchStats(period)} className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">
            <RefreshCw size={16} /> Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { period: ps, topics: ts, difficulties: ds } = data;

  const diffChartData = [1, 2, 3, 4, 5].map(level => {
    const existingData = ds?.difficulties?.find(d => d.difficulty === level);
    return existingData || { difficulty: level, total_tasks: 0, correct_tasks: 0, mastery_percent: 0 };
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 md:px-0">
      
      {/* 1. ГЛАВНАЯ ПАНЕЛЬ СВОДКИ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-slate-100/80 dark:border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50 to-transparent dark:from-slate-700/30 dark:to-transparent rounded-full -mr-32 -mt-32 z-0 opacity-50 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
        
        <div className="relative z-10 space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 transform -rotate-3 shrink-0">
                <BarChart3 size={22} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                  Дашборд
                </h2>
                <p className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest mt-1">Глобальная статистика</p>
              </div>
            </div>

            <div className="flex gap-1.5 bg-slate-50/80 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-600 w-full sm:w-auto backdrop-blur-sm overflow-x-auto scrollbar-none">
              {PERIODS.map((p) => (
                <button
                  key={p.k}
                  onClick={() => handlePeriodChange(p.k)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                    period === p.k ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          {ps && (
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 ${loading ? 'opacity-50 blur-[2px]' : ''} transition-all duration-300`}>
              <div className="bg-slate-50/60 dark:bg-slate-900/40 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center hover:-translate-y-0.5 transition-transform">
                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" /> Решено тестов
                </div>
                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{ps.total_tests}</div>
              </div>
              <div className="bg-slate-50/60 dark:bg-slate-900/40 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center hover:-translate-y-0.5 transition-transform">
                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" /> Всего задач
                </div>
                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{ps.total_tasks}</div>
              </div>
              <div className="bg-blue-50/40 dark:bg-blue-950/20 p-4 md:p-5 rounded-2xl border border-blue-100/80 dark:border-blue-900/40 flex flex-col justify-center hover:-translate-y-0.5 transition-transform relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 text-blue-600"><Target size={70} /></div>
                <div className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 relative z-10 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Винрейт
                </div>
                <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 relative z-10">{ps.avg_score?.toFixed(1) || 0}%</div>
              </div>
              <div className="bg-amber-50/40 dark:bg-amber-950/20 p-4 md:p-5 rounded-2xl border border-amber-100/80 dark:border-amber-900/40 flex flex-col justify-center hover:-translate-y-0.5 transition-transform relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 text-amber-500"><Flame size={70} /></div>
                <div className="text-[9px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5 relative z-10 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Стрик активности
                </div>
                <div className="text-2xl md:text-3xl font-black text-amber-500 relative z-10 flex items-end gap-1">
                  {ps.streak_days} <span className="text-xs md:text-sm text-amber-500/70 mb-0.5">дней</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. ТЕМЫ И ПОДТЕМЫ */}
      {ts && ts.topics?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-slate-100/80 dark:border-slate-700 flex flex-col">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 md:pb-5 mb-4 md:mb-5 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                <Activity size={18} />
              </div>
              <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Разбор по темам</h3>
            </div>
            
            {ts.strongest_topic && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/30 w-fit">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-[9px] md:text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Топ: <span className="truncate max-w-[100px] md:max-w-[120px] inline-block align-bottom">{ts.strongest_topic.topic}</span> ({ts.strongest_topic.mastery_percent}%)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 md:space-y-3">
            {ts.topics.map((t, i) => {
              const hasSections = t.sections && t.sections.length > 0;
              const isExpanded = expandedTopics[i];

              return (
                <div key={i} className="flex flex-col gap-2">
                  <div 
                    onClick={() => hasSections && toggleTopic(i)}
                    className={`group p-3.5 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 rounded-2xl border border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${hasSections ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2.5">
                      {hasSections && (
                        <div className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs md:text-sm">{t.topic}</div>
                        <div className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 mt-0.5">Решено: {t.correct_tasks} из {t.total_tasks}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-[240px] md:w-[280px] pl-6 sm:pl-0">
                      <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${t.mastery_percent >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : t.mastery_percent >= 40 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} 
                          style={{ width: `${Math.min(100, t.mastery_percent)}%` }} 
                        />
                      </div>
                      <span className="font-black text-slate-900 dark:text-white w-9 text-right text-xs md:text-sm">{t.mastery_percent}%</span>
                    </div>
                  </div>

                  {isExpanded && hasSections && (
                    <div className="pl-6 md:pl-9 space-y-2 mb-1 animate-in slide-in-from-top-2 fade-in duration-200">
                      {t.sections.map((sec, j) => (
                        <div key={j} className="p-3 bg-white dark:bg-slate-800 rounded-xl border-l-4 border-l-blue-400 dark:border-l-blue-600 border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px] md:text-xs">{sec.section}</div>
                            <div className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 mt-0.5">{sec.correct_tasks} / {sec.total_tasks} задач</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 w-full sm:w-[180px]">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${sec.mastery_percent >= 70 ? 'bg-emerald-400' : sec.mastery_percent >= 40 ? 'bg-blue-400' : 'bg-red-400'}`} 
                                style={{ width: `${Math.min(100, sec.mastery_percent)}%` }} 
                              />
                            </div>
                            <span className="font-bold text-slate-600 dark:text-slate-400 w-8 text-right text-[10px] md:text-xs">{sec.mastery_percent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. СЛОЖНОСТЬ (Визуальная гистограмма внизу) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 shadow-sm border border-slate-100/80 dark:border-slate-700 flex flex-col overflow-x-hidden">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700 pb-4 md:pb-5 mb-6 md:mb-8">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
            <Layers size={18} />
          </div>
          <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Винрейт по сложности</h3>
        </div>

        <div className="relative h-44 md:h-60 w-full flex items-end justify-between sm:justify-around px-1 sm:px-6 pb-6">
          
          <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none z-0">
            {[100, 75, 50, 25, 0].map(val => (
              <div key={val} className="flex items-center w-full">
                <span className="w-6 md:w-8 text-[8px] md:text-[9px] font-black text-slate-300 dark:text-slate-600 mr-1 md:mr-2 text-right">{val}%</span>
                <div className="flex-1 border-b border-dashed border-slate-100 dark:border-slate-700/60" />
              </div>
            ))}
          </div>

          {diffChartData.map((d) => {
            const heightPercent = Math.max(d.mastery_percent, 5);
            const isEmpty = d.total_tasks === 0;

            return (
              <div key={d.difficulty} className="relative z-10 flex flex-col items-center group w-[18%] sm:w-auto">
                
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1.5 transition-all duration-300 pointer-events-none flex flex-col items-center z-20 hidden md:flex">
                  <div className="bg-slate-900 dark:bg-slate-700 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap shadow-xl">
                    Решено: {d.correct_tasks} / {d.total_tasks}
                  </div>
                  <div className="w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45 -mt-1" />
                </div>

                <div className={`mb-2 text-[10px] md:text-xs font-black transition-transform duration-300 group-hover:-translate-y-1 ${isEmpty ? 'text-slate-300 dark:text-slate-600' : CHART_TEXT[d.difficulty]}`}>
                  {d.mastery_percent}%
                </div>

                <div className="w-9 sm:w-12 md:w-16 h-32 md:h-44 bg-slate-50 dark:bg-slate-900/40 rounded-t-xl flex items-end overflow-hidden border-x border-t border-slate-100 dark:border-slate-700/60">
                  <div 
                    className={`w-full rounded-t-xl transition-all duration-1000 ease-out ${isEmpty ? 'bg-slate-200 dark:bg-slate-700/60' : `bg-gradient-to-t ${CHART_GRADIENTS[d.difficulty]} group-hover:brightness-110`}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                <div className="absolute -bottom-5 flex flex-col items-center">
                  <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Ур {d.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}