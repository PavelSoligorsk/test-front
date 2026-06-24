import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp,
  Target,
  Award,
  Calendar,
  Clock,
  ChevronRight,
  ArrowLeft,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Star,
  Flame,
  BookOpen,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  XCircle,
 Trophy
} from 'lucide-react';

// В начало StatsPage.jsx добавляем (если ещё нет):
const MAIN_TOPICS = {
  'numbers': 'Числа и вычисления',
  'expressions': 'Выражения и их преобразования',
  'equations': 'Уравнения',
  'inequalities': 'Неравенства',
  'functions': 'Координаты и функции',
  'text': 'Текстовые задачи',
  'planim': 'Планиметрия',
  'stereo': 'Стереометрия',
  'geometry': 'Геометрия',
  'algebra': 'Алгебра',
};

// Функция для красивого отображения названия темы
const getTopicLabel = (topicKey) => {
  return MAIN_TOPICS[topicKey] || topicKey;
};

// ==================== КОМПОНЕНТ: КАРТОЧКА СТАТИСТИКИ ====================
const StatCard = ({ icon: Icon, label, value, sub, color = 'blue', gradient }) => (
  <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all ${gradient ? 'bg-gradient-to-br ' + gradient + ' text-white border-0' : ''}`}>
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient ? 'bg-white/20' : `bg-${color}-50`}`}>
        <Icon size={18} className={gradient ? 'text-white' : `text-${color}-600`} />
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest ${gradient ? 'text-white/70' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
    <div className={`text-3xl font-black ${gradient ? 'text-white' : 'text-slate-900'}`}>
      {value}
    </div>
    {sub && (
      <p className={`text-[10px] font-bold mt-1 ${gradient ? 'text-white/60' : 'text-slate-400'}`}>
        {sub}
      </p>
    )}
  </div>
);

// ==================== КОМПОНЕНТ: КРУГОВАЯ ДИАГРАММА ====================
const RingChart = ({ percentage = 0, size = 120, strokeWidth = 8, color = '#3b82f6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black text-slate-900">{percentage}%</span>
      </div>
    </div>
  );
};

// ==================== КОМПОНЕНТ: ГРАФИК АКТИВНОСТИ ====================
const ActivityGraph = ({ dailyStats = [] }) => {
  if (!dailyStats.length) return null;

  const maxScore = Math.max(...dailyStats.map(d => d.avg_score || 0), 1);

  return (
    <div className="flex items-end gap-2 h-40">
      {dailyStats.slice(-30).map((day, i) => {
        const heightPercent = ((day.avg_score || 0) / maxScore) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '100px' }}>
              <div
                className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-500"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-[8px] font-bold text-slate-400 rotate-45 origin-left whitespace-nowrap mt-2">
              {day.date?.slice(5)}
            </span>
            {/* Тултип */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {day.date}: {day.avg_score}% ({day.tests_count} тестов)
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
export default function StatsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  
  // Данные
  const [userInfo, setUserInfo] = useState(null);
  const [periodStats, setPeriodStats] = useState(null);
  const [topicsStats, setTopicsStats] = useState(null);
  const [difficultyStats, setDifficultyStats] = useState(null);
  
  // Определяем, чья статистика
  const isOwnStats = !userId;
  const apiPrefix = isOwnStats ? '/stats/me' : `/stats/user/${userId}`;

  useEffect(() => {
    fetchStats();
  }, [userId, period]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { token } = JSON.parse(localStorage.getItem('edu_session'));
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const baseURL = 'https://tests-production-46d5.up.railway.app';

      const [periodRes, topicsRes, diffRes] = await Promise.all([
        axios.get(`${baseURL}${apiPrefix}/period?period=${period}`, config),
        axios.get(`${baseURL}${apiPrefix}/topics?period=${period}`, config),
        axios.get(`${baseURL}${apiPrefix}/difficulty?period=${period}`, config)
      ]);

      setPeriodStats(periodRes.data);
      setTopicsStats(topicsRes.data);
      setDifficultyStats(diffRes.data);
      setUserInfo({
        name: periodRes.data.user_name,
        id: periodRes.data.user_id
      });
    } catch (err) {
      if (err.response?.status === 403) {
        setError('У вас нет доступа к этой статистике');
      } else if (err.response?.status === 404) {
        setError('Пользователь не найден');
      } else {
        setError('Ошибка загрузки статистики');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: '3months', label: '3 месяца' },
    { value: '6months', label: 'Полгода' },
    { value: 'year', label: 'Год' },
    { value: 'all', label: 'Всё время' }
  ];

  const getDifficultyColor = (level) => {
    const colors = {
      1: '#22c55e',
      2: '#84cc16',
      3: '#eab308',
      4: '#f97316',
      5: '#ef4444'
    };
    return colors[level] || '#64748b';
  };

  const getDifficultyLabel = (level) => {
    const labels = {
      1: 'Очень легко',
      2: 'Легко',
      3: 'Средне',
      4: 'Сложно',
      5: 'Очень сложно'
    };
    return labels[level] || `Уровень ${level}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="font-black uppercase tracking-widest text-slate-400 text-[10px]">
          Загрузка статистики...
        </p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="bg-white rounded-[2rem] p-8 text-center max-w-md shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Ошибка</h3>
        <p className="text-sm font-bold text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase hover:bg-slate-800 transition-all"
        >
          Назад
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Верхняя навигация */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-black uppercase hidden sm:inline">Назад</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-900 uppercase leading-tight">
                {userInfo?.name || 'Статистика'}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                {isOwnStats ? 'Моя статистика' : `ID: ${userId}`}
              </p>
            </div>
          </div>
        </div>
        
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Выбор периода */}
        <div className="bg-white rounded-[2rem] p-3 md:p-4 shadow-sm border border-slate-100">
          <div className="flex gap-2 overflow-x-auto">
            {periods.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                  period === p.value
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          
        </div>
        {/* Навигация по вкладкам (фиксированная снизу на мобилках) */}
        <div className="fixed bottom-4 left-4 right-4 md:static md:mt-0 z-40">
          <div className="bg-white rounded-[1.5rem] p-1.5 shadow-xl md:shadow-sm border border-slate-100 flex max-w-md mx-auto">
            {[
              { id: 'overview', label: 'Обзор', icon: Activity },
              { id: 'topics', label: 'Темы', icon: BookOpen },
              { id: 'difficulty', label: 'Сложность', icon: Zap }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ==================== ВКЛАДКА: ОБЗОР ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Основные карточки */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                icon={Activity}
                label="Всего тестов"
                value={periodStats?.total_tests || 0}
                sub="за период"
                color="blue"
              />
              <StatCard
                icon={Target}
                label="Средний балл"
                value={`${periodStats?.avg_score || 0}%`}
                sub={`Лучший: ${periodStats?.best_score || 0}%`}
                color="emerald"
              />
              <StatCard
                icon={BookOpen}
                label="Решено задач"
                value={periodStats?.total_tasks || 0}
                sub={`Правильно: ${periodStats?.correct_tasks || 0}`}
                color="purple"
              />
              <StatCard
                icon={Flame}
                label="Дней подряд"
                value={periodStats?.streak_days || 0}
                sub={periodStats?.streak_days > 0 ? '🔥 Продолжай!' : 'Начни сегодня!'}
                color="orange"
                gradient={periodStats?.streak_days > 5 ? 'from-orange-500 to-red-500' : null}
              />
            </div>

            {/* График активности */}
            {periodStats?.daily_stats?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 size={20} className="text-slate-400" />
                  <h3 className="text-lg font-black text-slate-900 uppercase">Активность по дням</h3>
                </div>
                <ActivityGraph dailyStats={periodStats.daily_stats} />
              </div>
            )}

            {/* Прогресс по сложности */}
            {difficultyStats?.difficulties?.length > 0 && (
              <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <Zap size={20} className="text-slate-400" />
                  <h3 className="text-lg font-black text-slate-900 uppercase">Успеваемость по сложности</h3>
                </div>
                <div className="space-y-4">
                  {difficultyStats.difficulties.map((item) => (
                    <div key={item.difficulty} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">
                          {getDifficultyLabel(item.difficulty)}
                        </span>
                        <span className="text-xs font-black text-slate-400">
                          {item.correct_tasks}/{item.total_tasks} • {item.mastery_percent}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${item.mastery_percent}%`,
                            backgroundColor: getDifficultyColor(item.difficulty)
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

       {/* ==================== ВКЛАДКА: ТЕМЫ ==================== */}
{activeTab === 'topics' && (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <PieChart size={20} className="text-slate-400" />
        <h3 className="text-lg font-black text-slate-900 uppercase">Усвоение тем</h3>
      </div>
      
      {topicsStats?.topics?.length > 0 ? (
        <div className="space-y-6">
          {/* В блоке отображения тем */}
{topicsStats?.topics
  ?.filter((topic, index, self) => 
    // 🔥 Убираем дубликаты по названию темы
    index === self.findIndex(t => 
      t.topic?.toLowerCase().trim() === topic.topic?.toLowerCase().trim()
    )
  ).map((topic) => (
            <div key={topic.topic} className="bg-slate-50 rounded-2xl p-5 md:p-6 border border-slate-100">
              {/* Заголовок темы */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    topic.mastery_percent >= 80 ? 'bg-emerald-500' :
                    topic.mastery_percent >= 60 ? 'bg-blue-500' :
                    topic.mastery_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase">
                      {getTopicLabel(topic.topic)}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {topic.total_tasks} задач • {topic.mastery_percent}% усвоения
                    </p>
                  </div>
                </div>
                
                {/* Общий прогресс темы */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        topic.mastery_percent >= 80 ? 'bg-emerald-500' :
                        topic.mastery_percent >= 60 ? 'bg-blue-500' :
                        topic.mastery_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${topic.mastery_percent}%` }}
                    />
                  </div>
                  <span className="text-lg font-black text-slate-700">{topic.mastery_percent}%</span>
                </div>
              </div>

              {/* 🔥 РАЗДЕЛЫ ВНУТРИ ТЕМЫ */}
              {topic.sections && topic.sections.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-3">
                    Разделы:
                  </p>
                  {topic.sections.map((section, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            section.mastery_percent >= 80 ? 'bg-emerald-500' :
                            section.mastery_percent >= 60 ? 'bg-blue-500' :
                            section.mastery_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs font-bold text-slate-600">
                            {section.section}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400">
                          {section.correct_tasks}/{section.total_tasks}
                        </span>
                      </div>
                      
                      {/* Мини прогресс-бар */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              section.mastery_percent >= 80 ? 'bg-emerald-400' :
                              section.mastery_percent >= 60 ? 'bg-blue-400' :
                              section.mastery_percent >= 40 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${section.mastery_percent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-black w-10 text-right ${
                          section.mastery_percent >= 80 ? 'text-emerald-600' :
                          section.mastery_percent >= 60 ? 'text-blue-600' :
                          section.mastery_percent >= 40 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {section.mastery_percent}%
                        </span>
                      </div>
                      
                      {/* Подсказка для слабых разделов */}
                      {section.mastery_percent < 40 && section.total_tasks >= 3 && (
                        <p className="text-[9px] font-bold text-red-400 mt-1.5 flex items-center gap-1">
                          <AlertCircle size={10} />
                          Требует внимания
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Если нет разделов — показываем только общий прогресс */}
              {(!topic.sections || topic.sections.length === 0) && (
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      topic.mastery_percent >= 80 ? 'bg-emerald-500' :
                      topic.mastery_percent >= 60 ? 'bg-blue-500' :
                      topic.mastery_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${topic.mastery_percent}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm font-bold text-slate-400">Нет данных по темам за этот период</p>
        </div>
      )}

      {/* Сильные и слабые стороны */}
      {(topicsStats?.strongest_topic || topicsStats?.weakest_topic) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {topicsStats.strongest_topic && (
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={18} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600 uppercase">Сильная сторона</span>
              </div>
              <p className="text-lg font-black text-emerald-800">{getTopicLabel(topicsStats.strongest_topic.topic)}</p>
              <p className="text-xs font-bold text-emerald-500 mt-1">
                {topicsStats.strongest_topic.mastery_percent}% усвоения
              </p>
            </div>
          )}
          {topicsStats.weakest_topic && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-600 uppercase">Требует внимания</span>
              </div>
              <p className="text-lg font-black text-amber-800">{getTopicLabel(topicsStats.weakest_topic.topic)}</p>
              <p className="text-xs font-bold text-amber-500 mt-1">
                {topicsStats.weakest_topic.mastery_percent}% усвоения
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
)}

        {/* ==================== ВКЛАДКА: СЛОЖНОСТЬ ====================*/}
{activeTab === 'difficulty' && (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <Zap size={20} className="text-amber-500" />
        <h3 className="text-lg font-black text-slate-900 uppercase">
          Успеваемость по сложности
        </h3>
      </div>
      
      {difficultyStats?.difficulties?.length > 0 ? (
        <div className="space-y-8">
          {/* Круговые диаграммы для каждого уровня */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(level => {
              const data = difficultyStats.difficulties.find(d => d.difficulty === level);
              const percentage = data?.mastery_percent || 0;
              const total = data?.total_tasks || 0;
              const correct = data?.correct_tasks || 0;
              const color = getDifficultyColor(level);
              
              return (
                <div key={level} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100 hover:shadow-md transition-all">
                  <RingChart 
                    percentage={percentage} 
                    size={90} 
                    strokeWidth={6} 
                    color={total > 0 ? color : '#e2e8f0'} 
                  />
                  <p className="text-xs font-black text-slate-700 mt-3 uppercase">
                    {getDifficultyLabel(level)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {total > 0 ? `${correct}/${total} задач` : 'Нет данных'}
                  </p>
                  {total > 0 && (
                    <p className="text-lg font-black mt-1" style={{ color }}>
                      {percentage}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Прогресс-бары */}
          <div className="space-y-5">
            <h4 className="text-sm font-black text-slate-500 uppercase flex items-center gap-2">
              <BarChart3 size={16} />
              Детальный прогресс
            </h4>
            {difficultyStats.difficulties.map((item) => (
              <div key={item.difficulty} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getDifficultyColor(item.difficulty) }}
                    />
                    <span className="text-xs font-bold text-slate-600">
                      {getDifficultyLabel(item.difficulty)}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-400">
                    {item.correct_tasks}/{item.total_tasks} задач
                  </span>
                </div>
                <div className="relative w-full h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                    style={{
                      width: `${item.mastery_percent}%`,
                      backgroundColor: getDifficultyColor(item.difficulty),
                      opacity: item.mastery_percent > 0 ? 1 : 0
                    }}
                  >
                    {item.mastery_percent > 15 && (
                      <span className="text-[8px] font-black text-white">
                        {item.mastery_percent}%
                      </span>
                    )}
                  </div>
                  {item.mastery_percent <= 15 && item.mastery_percent > 0 && (
                    <span 
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black"
                      style={{ color: getDifficultyColor(item.difficulty) }}
                    >
                      {item.mastery_percent}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Рекомендации */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Star size={20} className="text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-800 uppercase mb-2">
                  Рекомендация
                </h4>
                {(() => {
                  // Находим самый слабый уровень
                  const weakLevel = difficultyStats.difficulties
                    .filter(d => d.total_tasks >= 3)
                    .sort((a, b) => a.mastery_percent - b.mastery_percent)[0];
                  
                  if (weakLevel && weakLevel.mastery_percent < 50) {
                    return (
                      <p className="text-xs font-bold text-amber-700">
                        Обратите внимание на задачи уровня {weakLevel.difficulty} — 
                        "{getDifficultyLabel(weakLevel.difficulty)}". 
                        Успеваемость {weakLevel.mastery_percent}% — 
                        стоит уделить больше времени задачам этой сложности.
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-xs font-bold text-amber-700">
                        Отличный результат! Вы хорошо справляетесь с задачами разной сложности. 
                        Продолжайте в том же духе! 🎉
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 space-y-4">
          <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto">
            <Zap size={40} className="text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase">
            Нет данных по сложности
          </p>
          <p className="text-[10px] font-bold text-slate-300 uppercase max-w-xs mx-auto">
            Пройдите больше тестов, чтобы увидеть статистику по уровням сложности
          </p>
        </div>
      )}
    </div>
  </div>
)}

        

      </main>
    </div>
  );
}