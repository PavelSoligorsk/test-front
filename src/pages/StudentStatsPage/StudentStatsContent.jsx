import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, Flame, Inbox, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '../../shared/ui';
import { PageShell } from '../../shared/ui/Sheet';
import EmptyState from '../../shared/ui/EmptyState';
import { fetchMyDetailedStats } from '../StudentDashboardPage/api';
import StudentPageLoading from '../StudentDashboardPage/StudentPageLoading';
import { Histogram } from './charts';
import TopicsMastery from './TopicsMastery';

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

const STREAK_WINDOW = 7;

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

function fillDifficultyLevels(list) {
  return [1, 2, 3, 4, 5].map((level) => {
    const found = (list || []).find((d) => d.difficulty === level);
    return found || { difficulty: level, total_tasks: 0, correct_tasks: 0, mastery_percent: 0 };
  });
}

function aggregateTopicDifficulties(topics) {
  const map = new Map();
  topics.forEach((topic) => {
    (topic.difficulties || []).forEach((item) => {
      const prev = map.get(item.difficulty) || { difficulty: item.difficulty, total_tasks: 0, correct_tasks: 0 };
      prev.total_tasks += item.total_tasks || 0;
      prev.correct_tasks += item.correct_tasks || 0;
      map.set(item.difficulty, prev);
    });
  });
  return [...map.values()].map((item) => ({
    ...item,
    mastery_percent: item.total_tasks ? Math.round((item.correct_tasks / item.total_tasks) * 1000) / 10 : 0,
  }));
}

function difficultyChartItems(list) {
  return fillDifficultyLevels(list).map((item) => ({
    id: item.difficulty,
    label: DIFFICULTY_LABELS[item.difficulty],
    axis: `${item.difficulty} ур.`,
    value: item.mastery_percent || 0,
    meta: item.total_tasks > 0 ? `${item.correct_tasks}/${item.total_tasks}` : 'нет задач',
    empty: item.total_tasks === 0,
  }));
}

function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function recentDays(dailyStats) {
  if (!Array.isArray(dailyStats) || dailyStats.length === 0) return [];
  const byDate = new Map(dailyStats.map((item) => [String(item.date || '').slice(0, 10), item]));
  const today = new Date();
  return Array.from({ length: STREAK_WINDOW }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (STREAK_WINDOW - 1 - i));
    const key = dayKey(date);
    const tests = byDate.get(key)?.tests_count || 0;
    return {
      key,
      tests,
      label: `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`,
    };
  });
}

export default function StudentStatsContent({ fetchStats = fetchMyDetailedStats, onBack, backLabel = 'Назад' }) {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const firstLoad = useRef(true);

  const loadStats = useCallback(async (nextPeriod, { initial } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetchStats(nextPeriod);
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    loadStats(period, { initial: firstLoad.current });
    firstLoad.current = false;
  }, [loadStats, period]);

  const handlePeriod = (next) => {
    if (next === period) return;
    setPeriod(next);
  };

  const periodStats = data?.period;
  const topics = [...(data?.topics?.topics || [])].sort(
    (a, b) => (a.mastery_percent || 0) - (b.mastery_percent || 0)
  );
  const difficultySource = data?.difficulties?.difficulties?.length
    ? data.difficulties.difficulties
    : aggregateTopicDifficulties(topics);
  const difficulties = fillDifficultyLevels(difficultySource);
  const difficultyItems = difficultyChartItems(difficultySource);

  const totalTests = periodStats?.total_tests || 0;
  const avgScore = periodStats?.avg_score || 0;
  const streakDays = periodStats?.streak_days || 0;
  const bestScore = Number(periodStats?.best_score) || 0;
  const days = recentDays(periodStats?.daily_stats);
  const hasWork = totalTests > 0 || topics.length > 0;
  const difficultyTotal = difficulties.reduce((sum, item) => sum + (item.total_tasks || 0), 0);
  const difficultyCorrect = difficulties.reduce((sum, item) => sum + (item.correct_tasks || 0), 0);

  if (loading) return <StudentPageLoading variant="stats" />;

  return (
    <PageShell className="space-y-6 animate-in fade-in duration-500">
      {error ? (
        <EmptyState icon={<BarChart3 size={22} strokeWidth={1.5} />} title="Статистика не загрузилась" hint={error} className="py-20">
          <div className="flex items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                <ArrowLeft size={14} /> {backLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => loadStats(period, { initial: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900"
            >
              <RefreshCw size={14} /> Повторить
            </button>
          </div>
        </EmptyState>
      ) : (
        <div className={`space-y-6 ${refreshing ? 'opacity-60' : ''} transition-opacity`}>
          <section className="bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-4">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
                    title={backLabel}
                  >
                    <ArrowLeft size={18} strokeWidth={2} />
                  </button>
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
                    <BarChart3 size={18} strokeWidth={2} />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Статистика
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {periodStats?.user_name
                      ? `${periodStats.user_name} · как идут решения за период`
                      : 'Как идут решения за выбранный период'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
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
                {onBack ? <ThemeToggle /> : null}
              </div>
            </div>

            {!hasWork ? (
              <EmptyState
                framed={false}
                className="py-24 px-6"
                icon={<Inbox size={24} strokeWidth={1.5} />}
                title="Пока нечего считать"
                hint="Пройдите первый тест — здесь появятся средний результат, темы и сложность."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800/60">
                <StatFigure
                  value={`${formatScore(avgScore)}%`}
                  caption={bestScore > 0 ? `средний · лучший ${formatScore(bestScore)}%` : 'средний результат'}
                />
                <StatFigure
                  value={totalTests}
                  caption={ruWord(totalTests, 'тест решён', 'теста решено', 'тестов решено')}
                />
                <StreakFigure days={streakDays} recent={days} />
              </div>
            )}
          </section>

          {hasWork && (
            <div className={topics.length > 0 ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}>
              {topics.length > 0 && <TopicsMastery key={period} topics={topics} />}

              <section className="bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 pb-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Сложность</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Доля верных ответов по уровням 1–5
                  </p>
                </div>
                {difficultyTotal === 0 ? (
                  <div className="px-6 md:px-8 pb-8 pt-4">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Задач с уровнем сложности за этот период не было.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 md:px-5 pt-2">
                      <Histogram items={difficultyItems} ariaLabel="Доля верных ответов по уровням сложности" />
                    </div>
                    <div className="px-6 md:px-8 py-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{difficultyTotal} {ruWord(difficultyTotal, 'задача', 'задачи', 'задач')}</span>
                      <span className="tabular-nums">{difficultyCorrect} верных</span>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function StatFigure({ value, caption }) {
  return (
    <div className="px-6 md:px-8 py-8">
      <p className="text-2xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{caption}</p>
    </div>
  );
}

function StreakFigure({ days, recent }) {
  const active = days > 0;
  return (
    <div className="px-6 md:px-8 py-8">
      <div className="flex items-center gap-3">
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
          {days}
        </p>
        <Flame
          size={26}
          strokeWidth={1.75}
          fill={active ? 'currentColor' : 'none'}
          className={active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-300 dark:text-zinc-700'}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
        {active ? ruWord(days, 'день подряд', 'дня подряд', 'дней подряд') : 'нет серии'}
      </p>
      {recent.length > 0 && (
        <div className="flex items-center gap-1.5 mt-4" aria-hidden="true">
          {recent.map((day) => (
            <span
              key={day.key}
              title={`${day.label}: ${day.tests} ${ruWord(day.tests, 'тест', 'теста', 'тестов')}`}
              className={`w-2 h-2 rounded-full ${
                day.tests > 0 ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            />
          ))}
          <span className="ml-2 text-[11px] text-zinc-400 dark:text-zinc-500">7 дней</span>
        </div>
      )}
    </div>
  );
}
