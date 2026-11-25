import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../shared/api';
import { DifficultyBadge, EmptyState, PageLoading, PageShell, QuestionMap, SummaryCard, secondaryBtnClass } from '../../shared/ui';
import { ResultTask } from '../../shared/ui/TaskView';
import { sortExamTasks } from '../../shared/lib/examOrder';
import { formatAttemptTime } from '../../shared/lib/attemptTime';

function cleanTitle(title) {
  return (title || '').replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim();
}

export default function TeacherResultViewContent() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openSolutions, setOpenSolutions] = useState({});

  const toggleSolution = (id) => setOpenSolutions((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await apiClient.get(`/teacher/results/${resultId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  const sortedDetails = useMemo(() => (data?.details ? sortExamTasks(data.details) : []), [data]);

  if (loading) return <PageLoading />;

  if (failed || !data) {
    return (
      <PageShell>
        <EmptyState title="Результат не открылся" hint="Вернитесь назад">
          <button type="button" onClick={() => navigate(-1)} className={secondaryBtnClass}>Назад</button>
        </EmptyState>
      </PageShell>
    );
  }

  const percent = data.max_points > 0 ? Math.round((data.total_points / data.max_points) * 100) : 0;
  const student = [data.user?.first_name, data.user?.last_name].filter(Boolean).join(' ');

  return (
    <PageShell className="!max-w-3xl space-y-3">
      <SummaryCard
        onBack={() => navigate(-1)}
        backLabel="Назад"
        title={cleanTitle(data.test_title)}
        hint={[
          student || (data.completed_at || data.is_completed ? 'Результат прохождения' : 'Попытка не сдана'),
          data.started_at ? formatAttemptTime(data.started_at) : '',
          Number.isFinite(Number(data.time_spent_seconds)) ? `${Math.floor(Number(data.time_spent_seconds) / 60)} мин в тесте` : '',
        ].filter(Boolean).join(' · ')}
        extra={(
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{percent}%</p>
            <p className="mt-2 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{data.total_points} / {data.max_points}</p>
          </div>
        )}
      >
        {data.difficulty_stats ? (
          <div className="flex flex-wrap gap-3 px-6 py-6 md:px-8">
            {Object.entries(data.difficulty_stats).map(([level, stat]) => (
              stat.total > 0 ? <DifficultyBadge key={level} level={parseInt(level, 10)} correct={stat.correct} total={stat.total} /> : null
            ))}
          </div>
        ) : null}
      </SummaryCard>

      <div className="space-y-3">
        {sortedDetails.map((item, idx) => (
          <ResultTask
            key={item.task_id}
            item={item}
            index={idx}
            match="text"
            showPoints
            userLabel="Ответ ученика"
            correctLabel="Эталонный ответ"
            solutionOpen={!!openSolutions[item.task_id]}
            onToggleSolution={() => toggleSolution(item.task_id)}
            solutionShowLabel="Показать решение"
            solutionHideLabel="Скрыть разбор"
            solutionCaption="Решение"
          />
        ))}
      </div>

      <QuestionMap
        details={sortedDetails}
        onScroll={(taskId) => {
          document.querySelector(`[data-task-id="${taskId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />
    </PageShell>
  );
}
