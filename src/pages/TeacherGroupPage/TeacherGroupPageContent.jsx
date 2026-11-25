import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, Send, Trophy, Users, XCircle } from 'lucide-react';
import apiClient from '../../shared/api';
import {
  EmptyState, InlineNotice, PageLoading, PageShell, SectionCard, Segmented,
  StatFigure, StatFigures, SummaryCard, formatApiDetail, useConfirm,
} from '../../shared/ui';
import AssignTestToGroupModal from '../TeacherDashboardPage/AssignTestToGroupModal';
import GroupStudentsModal from '../TeacherDashboardPage/GroupStudentsModal';
import GroupTestCard from './GroupTestCard';

async function fetchGroupPage(groupId) {
  const [groupsRes, assignRes, testsRes, studentsRes] = await Promise.all([
    apiClient.get('/teacher/groups/'),
    apiClient.get(`/teacher/groups/${groupId}/assignments`),
    apiClient.get('/teacher/tests'),
    apiClient.get('/teacher/students'),
  ]);
  const list = Array.isArray(groupsRes.data) ? groupsRes.data : [];
  const found = list.find((group) => String(group.id) === String(groupId));
  if (!found) return null;
  return {
    group: { ...found, name: found.name || assignRes.data?.group_name },
    assignments: assignRes.data,
    tests: testsRes.data || [],
    students: studentsRes.data || [],
  };
}

function actionClass() {
  return 'inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-white';
}

export default function TeacherGroupPageContent() {
  const confirm = useConfirm();
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [tests, setTests] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('assigned');
  const [assignOpen, setAssignOpen] = useState(false);
  const [studentsModal, setStudentsModal] = useState(false);

  const load = useCallback(() => fetchGroupPage(groupId)
    .then((page) => {
      if (!page) {
        setError('Группа не найдена');
        setGroup(null);
        return;
      }
      setError(null);
      setGroup(page.group);
      setAssignments(page.assignments);
      setTests(page.tests);
      setAllStudents(page.students);
    })
    .catch((err) => {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.response?.status === 404 ? 'Группа не найдена' : 'Не удалось загрузить группу');
    })
    .finally(() => setLoading(false)), [groupId, navigate]);

  useEffect(() => { load(); }, [load]);

  const testsList = useMemo(() => assignments?.tests || [], [assignments]);
  const solvedTests = useMemo(
    () => testsList.filter((test) => (test.students || []).some((row) => row.is_completed)),
    [testsList]
  );

  const handleRemoveStudent = async (gid, studentId) => {
    try {
      await apiClient.delete(`/teacher/groups/${gid}/students/${studentId}`);
      await load();
      setNotice({ tone: 'success', text: 'Ученик убран из группы' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось убрать ученика') });
    }
  };

  const handleAddStudents = async (gid, studentIds) => {
    try {
      await apiClient.post(`/teacher/groups/${gid}/students`, { student_ids: studentIds });
      setStudentsModal(false);
      await load();
      setNotice({ tone: 'success', text: 'Состав группы обновлён' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось добавить учеников') });
    }
  };

  const handleUnassign = async (testId) => {
    if (!(await confirm('Снять этот тест со всей группы? Индивидуальные назначения не изменятся.', { danger: true, confirmLabel: 'Снять' }))) return;
    try {
      await apiClient.delete(`/teacher/groups/${groupId}/assignments/${testId}`);
      await load();
      setNotice({ tone: 'success', text: 'Тест снят с группы' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось снять тест') });
    }
  };

  const handleAssign = async (testId, gid) => {
    await apiClient.post('/teacher/assign-test-to-group', { test_id: testId, group_id: gid });
    await load();
    setNotice({ tone: 'success', text: 'Тест назначен группе' });
  };

  if (loading) return <PageLoading />;

  if (error || !group) {
    return (
      <PageShell>
        <EmptyState title={error || 'Ошибка загрузки'} hint="Вернитесь к списку групп">
          <button type="button" onClick={() => navigate('/teacher/groups')} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900">К группам</button>
        </EmptyState>
      </PageShell>
    );
  }

  const members = group.students || [];
  const visibleTests = tab === 'solved' ? solvedTests : testsList;

  return (
    <PageShell className="space-y-6">
      <SummaryCard
        onBack={() => navigate('/teacher/groups')}
        backLabel="К группам"
        title={group.name}
        hint={group.description || 'Назначения и состав'}
        extra={(
          <button type="button" onClick={() => setAssignOpen(true)} className={actionClass()}>
            <Send size={14} /> Назначить тест
          </button>
        )}
      >
        <StatFigures columns={3}>
          <StatFigure value={testsList.length} caption="назначено" />
          <StatFigure value={solvedTests.length} caption="решено" />
          <StatFigure value={members.length} caption="учеников" />
        </StatFigures>
      </SummaryCard>

      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Ученики"
          hint={members.length ? 'Состав группы' : 'Пока пусто'}
          extra={(
            <button type="button" onClick={() => setStudentsModal(true)} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Состав
            </button>
          )}
        >
          {members.length === 0 ? (
            <EmptyState framed={false} className="py-12" icon={<Users size={20} />} title="Нет учеников" hint="Добавьте состав" />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {members.map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-6 py-4 md:px-8">
                  <button type="button" onClick={() => navigate(`/teacher/students/${student.id}`)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-zinc-500">@{student.username}</p>
                  </button>
                  <button type="button" onClick={() => navigate(`/stats/${student.id}`)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" title="Статистика">
                    <Trophy size={14} />
                  </button>
                  <button type="button" onClick={() => handleRemoveStudent(group.id, student.id)} className="rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" title="Убрать из группы">
                    <XCircle size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Тесты"
          hint={tab === 'solved' ? 'Сдал хотя бы один ученик' : 'Назначены группе'}
          extra={(
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'assigned', label: 'Назначенные' },
                { value: 'solved', label: 'Решённые' },
              ]}
            />
          )}
        >
          {visibleTests.length === 0 ? (
            <EmptyState
              framed={false}
              className="py-16"
              icon={tab === 'solved' ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
              title={tab === 'solved' ? 'Пока никто не сдал' : 'Нет назначенных тестов'}
              hint={tab === 'solved' ? 'Тест появится здесь, как только его сдаст хотя бы один ученик' : 'Назначьте тест группе'}
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {visibleTests.map((test) => (
                <li key={test.test_id} className="px-6 py-4 md:px-8">
                  <GroupTestCard
                    test={test}
                    groupId={groupId}
                    navigate={navigate}
                    onUnassign={handleUnassign}
                    solversOnly={tab === 'solved'}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {assignOpen ? (
        <AssignTestToGroupModal
          group={group}
          tests={tests}
          onClose={() => { setAssignOpen(false); load(); }}
          onAssign={handleAssign}
          navigate={navigate}
        />
      ) : null}
      {studentsModal ? (
        <GroupStudentsModal
          group={group}
          allStudents={allStudents}
          onClose={() => setStudentsModal(false)}
          onAdd={handleAddStudents}
          onRemove={handleRemoveStudent}
          navigate={navigate}
        />
      ) : null}
    </PageShell>
  );
}
