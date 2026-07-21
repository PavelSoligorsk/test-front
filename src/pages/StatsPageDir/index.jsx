import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart3, TrendingUp, Award, Activity, ChevronLeft, ChevronRight,
  Calendar, Target, Brain, Clock, Sparkles, Zap, Flame, BookOpen,
  CheckCircle2, XCircle, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { API_URL } from '../../shared/config';

const PERIODS = [
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: '3months', label: '3 месяца' },
  { key: '6months', label: '6 месяцев' },
  { key: 'year', label: 'Год' },
  { key: 'all', label: 'Всё время' },
];

const difficultyColors = {
  1: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', label: 'Оч. легкий' },
  2: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', label: 'Легкий' },
  3: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', label: 'Средний' },
  4: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', label: 'Сложный' },
  5: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Оч. сложный' },
};

function getToken() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return session?.token || session?.access_token;
  } catch { return null; }
}

export default function StatsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const baseUrl = userId ? `${API_URL}/admin/users/${userId}/stats` : `${API_URL}/student/stats`;
        const res = await axios.get(`${baseUrl}?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Ошибка загрузки статистики');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId, period]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 border-4 border-slate-200 dark:border-slate-700 border-t-violet-600 rounded-full animate-spin mx-auto" />
        <p className="font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-[10px]">Загрузка статистики...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto"><XCircle size={28} className="text-red-500" /></div>
        <p className="font-black uppercase text-red-500 text-sm">{error}</p>
        <button onClick={() => navigate('/student')} className="text-[10px] font-black text-slate-400 hover:text-slate-600 underline">← Назад</button>
      </div>
    </div>
  );

  if (!data) return null;

  const { period: periodStats, topics: topicsStats, difficulties: difficultiesStats } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Заголовок */}
        <div className="text-center pt-6">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                {userId ? 'Статистика ученика' : 'Моя статистика'}
              </h1>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {periodStats?.user_name || ''} • {periodStats?.total_tests || 0} тестов
              </p>
            </div>
          </div>

          {/* Периоды */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => { setPeriod(p.key); setActiveTab('overview'); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  period === p.key
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30'
                    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Табы */}
        <div className="flex justify-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm w-fit mx-auto">
          {[
            { key: 'overview', label: 'Обзор', icon: BarChart3 },
            { key: 'topics', label: 'Темы', icon: BookOpen },
            { key: 'difficulties', label: 'Сложность', icon: Brain },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}>
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Карточки */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Тестов пройдено', value: periodStats?.total_tests || 0, icon: Activity, color: 'blue' },
                { label: 'Средний балл', value: `${periodStats?.avg_score || 0}%`, icon: Award, color: 'emerald' },
                { label: 'Лучший результат', value: `${periodStats?.best_score || 0}%`, icon: Sparkles, color: 'amber' },
                { label: 'Худший результат', value: `${periodStats?.worst_score || 0}%`, icon: Target, color: 'red' },
              ].map((card, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                  <div className={`w-8 h-8 bg-${card.color}-50 dark:bg-${card.color}-900/20 rounded-xl flex items-center justify-center mb-3`}>
                    <card.icon size={16} className={`text-${card.color}-600 dark:text-${card.color}-400`} />
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{card.value}</div>
                  <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Стрелка */}
            {periodStats?.streak_days > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                  <Flame size={24} className="text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{periodStats.streak_days} дней</div>
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Подряд</div>
                </div>
                <div className="ml-auto">
                  <Clock size={20} className="text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            )}

            {/* Ежедневная статистика */}
            {periodStats?.daily_stats?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Активность по дням</h3>
                <div className="space-y-3">
                  {periodStats.daily_stats.slice(-14).reverse().map((day, i) => {
                    const pct = day.avg_score || 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 w-20 shrink-0">{day.date?.slice(5) || '-'}</span>
                        <div className="flex-1 h-4 bg-slate-50 dark:bg-slate-700/50 rounded-full overflow-hidden relative">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-700"
                            style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 w-12 text-right">{pct}%</span>
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 w-16 text-right">{day.tests_count} тест{day.tests_count > 1 ? 'а' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'topics' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {topicsStats?.topics?.length > 0 ? (
              <>
                {/* Сильные и слабые темы */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topicsStats.strongest_topic && topicsStats.strongest_topic.total_tasks > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                          <ArrowUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Сильная тема</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{topicsStats.strongest_topic.topic}</div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                        {topicsStats.strongest_topic.correct_tasks}/{topicsStats.strongest_topic.total_tasks} правильных
                      </div>
                      <div className="mt-3 w-full h-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${topicsStats.strongest_topic.mastery_percent}%` }} />
                      </div>
                    </div>
                  )}
                  {topicsStats.weakest_topic && topicsStats.weakest_topic.total_tasks > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-800/40 shadow-sm p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                          <ArrowDown size={16} className="text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Слабая тема</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{topicsStats.weakest_topic.topic}</div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                        {topicsStats.weakest_topic.correct_tasks}/{topicsStats.weakest_topic.total_tasks} правильных
                      </div>
                      <div className="mt-3 w-full h-2 bg-red-50 dark:bg-red-900/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${topicsStats.weakest_topic.mastery_percent}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Все темы */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Все темы</h3>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {topicsStats.topics.map((topic, i) => (
                      <div key={i} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm">{topic.topic}</h4>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                              {topic.correct_tasks}/{topic.total_tasks} правильных
                            </p>
                          </div>
                          <div className={`text-2xl font-black ${topic.mastery_percent >= 70 ? 'text-emerald-600 dark:text-emerald-400' : topic.mastery_percent >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {topic.mastery_percent}%
                          </div>
                        </div>
                        <div className="w-full h-2 bg-slate-50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            topic.mastery_percent >= 70 ? 'bg-emerald-500' : topic.mastery_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${Math.max(topic.mastery_percent, 2)}%` }} />
                        </div>
                        {topic.sections?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {topic.sections.map((sec, j) => (
                              <span key={j} className={`text-[8px] font-bold px-2 py-0.5 rounded-lg ${
                                sec.mastery_percent >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                                sec.mastery_percent >= 40 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                              }`}>
                                {sec.section}: {sec.mastery_percent}%
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                  <BookOpen size={24} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-black text-slate-300 dark:text-slate-500 uppercase text-sm">Нет данных по темам</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Пройдите тесты, чтобы увидеть статистику</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'difficulties' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {difficultiesStats?.difficulties?.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Brain size={14} /> Успеваемость по сложности
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {difficultiesStats.difficulties.map((diff, i) => {
                    const colors = difficultyColors[diff.difficulty] || difficultyColors[3];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${colors.bg} ${colors.text}`}>
                              {colors.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              {diff.correct_tasks}/{diff.total_tasks}
                            </span>
                            <span className={`text-sm font-black w-12 text-right ${diff.mastery_percent >= 70 ? 'text-emerald-600 dark:text-emerald-400' : diff.mastery_percent >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                              {diff.mastery_percent}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            diff.mastery_percent >= 70 ? 'bg-emerald-500' : diff.mastery_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`} style={{ width: `${Math.max(diff.mastery_percent, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                  <Brain size={24} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-black text-slate-300 dark:text-slate-500 uppercase text-sm">Нет данных по сложности</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Пройдите тесты разного уровня</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}