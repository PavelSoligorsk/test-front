import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { fetchMyDetailedStats } from '../StudentDashboardPage/api';
import StudentPageLoading from '../StudentDashboardPage/StudentPageLoading';

const PERIODS = [
  { k: 'all', l: 'Всё время' },
  { k: 'year', l: 'Год' },
  { k: 'month', l: 'Месяц' },
  { k: 'week', l: 'Неделя' },
];

const DIFFICULTY_LABELS = {
  1: 'Уровень 1',
  2: 'Уровень 2',
  3: 'Уровень 3',
  4: 'Уровень 4',
  5: 'Уровень 5',
};

function ruWord(n, one, few, many) {
  const abs = Math.abs(Number(n) || 0) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}

function formatScore(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function StudentStatsContent() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});
  const firstLoad = useRef(true);

  const loadStats = useCallback(async (nextPeriod, { initial } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetchMyDetailedStats(nextPeriod);
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats(period, { initial: firstLoad.current });
    firstLoad.current = false;
  }, [loadStats, period]);

  const handlePeriod = (next) => {
    if (next === period) return;
    setPeriod(next);
    setExpandedTopics({});
  };

  const toggleTopic = (index) => {
    setExpandedTopics((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const periodStats = data?.period;
  const topics = [...(data?.topics?.topics || [])].sort(
    (a, b) => (a.mastery_percent || 0) - (b.mastery_percent || 0)
  );
  const difficulties = [1, 2, 3, 4, 5].map((level) => {
    const found = data?.difficulties?.difficulties?.find((d) => d.difficulty === level);
    return found || { difficulty: level, total_tasks: 0, correct_tasks: 0, mastery_percent: 0 };
  });

  const totalTests = periodStats?.total_tests || 0;
  const avgScore = periodStats?.avg_score || 0;
  const streakDays = periodStats?.streak_days || 0;
  const hasWork = totalTests > 0 || topics.length > 0;

  if (loading) return <StudentPageLoading variant="stats" />;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {error ? (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-20 px-6 flex flex-col items-center text-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
            <BarChart3 size={22} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Статистика не загрузилась</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadStats(period, { initial: true })}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900"
          >
            <RefreshCw size={14} /> Повторить
          </button>
        </div>
      ) : (
        <div className={`space-y-6 ${refreshing ? 'opacity-60' : ''} transition-opacity`}>
          <section className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
                  <BarChart3 size={18} strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Статистика
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Как идут решения за выбранный период
                  </p>
                </div>
              </div>

              <div className="flex items-center p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/80 w-full md:w-auto overflow-x-auto">
                {PERIODS.map((item) => {
                  const active = period === item.k;
                  return (
                    <button
                      key={item.k}
                      type="button"
                      onClick={() => handlePeriod(item.k)}
                      className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${
                        active
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/80 dark:border-zinc-700/80'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      {item.l}
                    </button>
                  );
                })}
              </div>
            </div>

            {!hasWork ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                  <Inbox size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Пока нечего считать</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                    Пройдите первый тест — здесь появятся средний результат, темы и сложность.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800/60">
                <StatFigure
                  value={totalTests}
                  caption={ruWord(totalTests, 'тест решён', 'теста решено', 'тестов решено')}
                />
                <StatFigure
                  value={`${formatScore(avgScore)}%`}
                  caption="средний результат"
                />
                <StatFigure
                  value={streakDays}
                  caption={streakDays > 0 ? ruWord(streakDays, 'день подряд', 'дня подряд', 'дней подряд') : 'нет серии'}
                />
              </div>
            )}
          </section>

          {hasWork && (
            <div className={topics.length > 0 ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}>
              {topics.length > 0 && (
                <section className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
                  <div className="p-6 md:p-8 pb-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Темы</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Доля верных ответов, слабые сверху
                    </p>
                  </div>
                  <ScaleRuler />
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {topics.map((topic, index) => {
                      const hasSections = topic.sections?.length > 0;
                      const open = !!expandedTopics[index];
                      return (
                        <li key={`${topic.topic}-${index}`}>
                          <div
                            role={hasSections ? 'button' : undefined}
                            tabIndex={hasSections ? 0 : undefined}
                            aria-expanded={hasSections ? open : undefined}
                            onClick={() => hasSections && toggleTopic(index)}
                            onKeyDown={(e) => {
                              if (hasSections && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                toggleTopic(index);
                              }
                            }}
                            className={`px-6 md:px-8 py-4 ${
                              hasSections
                                ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40 focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40'
                                : ''
                            }`}
                          >
                            <MasteryRow
                              label={topic.topic}
                              meta={`${topic.correct_tasks} из ${topic.total_tasks}`}
                              percent={topic.mastery_percent}
                              trailing={
                                hasSections ? (
                                  open ? (
                                    <ChevronDown size={16} className="text-zinc-400 shrink-0" />
                                  ) : (
                                    <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                                  )
                                ) : null
                              }
                            />
                          </div>
                          {open && hasSections && (
                            <ul className="pb-3">
                              {topic.sections.map((section, j) => (
                                <li key={`${section.section}-${j}`} className="px-6 md:px-8 pl-10 md:pl-14 py-2.5">
                                  <MasteryRow
                                    compact
                                    label={section.section}
                                    meta={`${section.correct_tasks}/${section.total_tasks}`}
                                    percent={section.mastery_percent}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 pb-4">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Сложность</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Верные ответы по уровням 1–5
                  </p>
                </div>
                <ScaleRuler />
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {difficulties.map((item) => {
                    const empty = item.total_tasks === 0;
                    return (
                      <li key={item.difficulty} className="px-6 md:px-8 py-4">
                        <MasteryRow
                          label={DIFFICULTY_LABELS[item.difficulty]}
                          meta={empty ? 'нет задач' : `${item.correct_tasks} из ${item.total_tasks}`}
                          percent={item.mastery_percent}
                          empty={empty}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function StatFigure({ value, caption }) {
  return (
    <div className="px-6 md:px-8 py-8">
      <p className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{caption}</p>
    </div>
  );
}

function ScaleRuler() {
  return (
    <div className="px-6 md:px-8 pb-3 flex justify-between text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
      <span>0%</span>
      <span>50</span>
      <span>100</span>
    </div>
  );
}

function MasteryRow({ label, meta, percent, empty, compact, trailing }) {
  const p = empty ? 0 : Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <p className={`min-w-0 flex-1 truncate ${compact ? 'text-sm text-zinc-600 dark:text-zinc-400' : 'text-sm font-medium text-zinc-900 dark:text-zinc-200'}`}>
          {label}
        </p>
        <span className={`shrink-0 tabular-nums ${compact ? 'text-xs text-zinc-400' : 'text-xs text-zinc-500'}`}>
          {meta}
        </span>
        <span className={`w-12 text-right shrink-0 tabular-nums ${
          empty
            ? 'text-sm text-zinc-300 dark:text-zinc-600'
            : compact
              ? 'text-xs font-medium text-zinc-600 dark:text-zinc-300'
              : 'text-sm font-semibold text-zinc-900 dark:text-zinc-100'
        }`}>
          {empty ? '—' : `${Math.round(p)}%`}
        </span>
        {trailing}
      </div>
      <div className={`${compact ? 'h-1.5' : 'h-2.5'} rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden`}>
        <div
          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
