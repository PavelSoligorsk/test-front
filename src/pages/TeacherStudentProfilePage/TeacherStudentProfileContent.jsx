import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import apiClient from '../../shared/api';
import {
  AttemptHistory, EmptyState, InlineNotice, PageLoading, PageShell, SectionCard,
  StatFigure, StatFigures, SummaryCard, formatApiDetail, useConfirm,
} from '../../shared/ui';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function TeacherStudentProfileContent() {
  const confirm = useConfirm();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, historyRes, assignmentsRes] = await Promise.all([
          apiClient.get(`/teacher/students-profile/${userId}`),
          apiClient.get(`/teacher/students-history/${userId}`),
          apiClient.get(`/teacher/student/${userId}/assignments`),
        ]);
        setData(profileRes.data);
        setHistory(historyRes.data || []);
        setAssignments(assignmentsRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError(err.response?.status === 404 ? 'Ученик не найден' : 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, navigate]);

  const sortedAssignments = useMemo(
    () => [...assignments].sort((a, b) => Number(!!a.is_completed) - Number(!!b.is_completed)),
    [assignments]
  );

  const handleDeleteAssignment = async (assignmentId) => {
    if (!(await confirm('Отменить назначение теста?', { danger: true, confirmLabel: 'Отменить назначение', cancelLabel: 'Оставить' }))) return;
    try {
      await apiClient.delete(`/teacher/assignments/${assignmentId}`);
      const res = await apiClient.get(`/teacher/student/${userId}/assignments`);
      setAssignments(res.data || []);
      setNotice({ tone: 'success', text: 'Назначение снято' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось отменить назначение') });
    }
  };

  if (loading) return <PageLoading />;

  if (error || !data) {
    return (
      <PageShell>
        <EmptyState title={error || 'Ошибка загрузки'} hint="Вернитесь к списку учеников">
          <button type="button" onClick={() => navigate('/teacher/students')} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900">К ученикам</button>
        </EmptyState>
      </PageShell>
    );
  }

  const user = data.user || data;
  const stats = data.stats || null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;

  return (
    <PageShell className="space-y-6">
      <SummaryCard
        onBack={() => navigate('/teacher/students')}
        backLabel="К ученикам"
        title={name}
        hint={`@${user.username}`}
        extra={stats ? (
          <button
            type="button"
            onClick={() => navigate(`/stats/${user.id}`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <BarChart3 size={14} /> Статистика
          </button>
        ) : null}
      >
        {stats ? (
          <StatFigures>
            <StatFigure value={`${stats.avg_score}%`} caption="средний результат" />
            <StatFigure value={stats.total_attempts} caption="попыток" />
          </StatFigures>
        ) : null}
      </SummaryCard>

      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <SectionCard title="Контакты" hint="Телефон и Telegram">
            <div className="space-y-3 px-6 pb-8 md:px-8">
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                <span className="text-zinc-500">Телефон · </span>{user.phone || '—'}
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                <span className="text-zinc-500">Telegram · </span>{user.tg_username ? `@${user.tg_username}` : 'Не привязан'}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Назначенные тесты"
            hint={assignments.length ? `${assignments.length} в работе и сданных` : 'Пока нет назначений'}
          >
            {sortedAssignments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-500 md:px-8">Нет назначений</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {sortedAssignments.map((item) => {
                  const done = !!item.is_completed;
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-6 py-4 md:px-8">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.test_title}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          {done ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Выполнен</span> : <span className="inline-flex items-center gap-1"><Clock size={12} /> Ожидается</span>}
                          {item.due_date ? <span>до {formatDate(item.due_date)}</span> : null}
                          {item.percentage != null ? <span className="tabular-nums">{item.percentage}%</span> : null}
                        </p>
                      </div>
                      {done && item.result_id ? (
                        <button type="button" onClick={() => navigate(`/teacher/results/${item.result_id}`)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800" title="Открыть результат">
                          <ArrowRight size={14} />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleDeleteAssignment(item.id)} className="rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title="Отменить назначение">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <AttemptHistory
            tone="section"
            items={history}
            onOpen={(row) => navigate(`/teacher/results/${row.id}`)}
            showSpent
          />
        </div>
      </div>
    </PageShell>
  );
}
