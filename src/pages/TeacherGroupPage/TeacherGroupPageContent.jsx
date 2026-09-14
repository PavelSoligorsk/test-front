import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronLeft, Clock,
  FileText, LayoutDashboard, Send, Trash2, Trophy, Users, XCircle,
} from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { InlineNotice, ThemeToggle, formatApiDetail } from '../../shared/ui';
import AssignTestToGroupModal from '../TeacherDashboardPage/AssignTestToGroupModal';
import GroupStudentsModal from '../TeacherDashboardPage/GroupStudentsModal';

function authHeaders() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const token = session?.token || session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function studentName(row) {
  if (row.student_name) return row.student_name;
  const n = [row.first_name, row.last_name].filter(Boolean).join(' ');
  return n || `ID ${row.user_id || row.id}`;
}

export default function TeacherGroupPageContent() {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = authHeaders();
      const [groupsRes, assignRes, testsRes, studentsRes] = await Promise.all([
        axios.get(`${API_BASE}/teacher/groups/`, { headers }),
        axios.get(`${API_BASE}/teacher/groups/${groupId}/assignments`, { headers }),
        axios.get(`${API_BASE}/teacher/tests`, { headers }),
        axios.get(`${API_BASE}/teacher/students`, { headers }),
      ]);
      const list = Array.isArray(groupsRes.data) ? groupsRes.data : [];
      const found = list.find((g) => String(g.id) === String(groupId));
      if (!found) {
        setError('Группа не найдена');
        setGroup(null);
        return;
      }
      const assignData = assignRes.data;
      setGroup({
        ...found,
        name: found.name || assignData?.group_name,
      });
      setAssignments(assignData);
      setTests(testsRes.data || []);
      setAllStudents(studentsRes.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.response?.status === 404 ? 'Группа не найдена' : 'Не удалось загрузить группу');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const testsList = assignments?.tests || [];
  const assignedCount = testsList.length;
  const completedCount = useMemo(
    () => testsList.reduce((n, t) => n + (t.students || []).filter((s) => s.is_completed).length, 0),
    [testsList]
  );
  const solvedRows = useMemo(() => {
    const rows = [];
    for (const test of testsList) {
      for (const s of test.students || []) {
        if (!s.is_completed || !s.result_id) continue;
        rows.push({
          key: `${test.test_id}-${s.user_id}`,
          testTitle: test.test_title,
          student: studentName(s),
          userId: s.user_id,
          resultId: s.result_id,
          score: s.total_points,
          max: test.max_points,
          percentage: s.percentage,
          date: test.assigned_at,
        });
      }
    }
    return rows;
  }, [testsList]);

  const handleRemoveStudent = async (gid, studentId) => {
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${gid}/students/${studentId}`, { headers: authHeaders() });
      await load();
      setNotice({ tone: 'success', text: 'Ученик убран из группы' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось убрать ученика') });
    }
  };

  const handleAddStudents = async (gid, studentIds) => {
    try {
      await axios.post(`${API_BASE}/teacher/groups/${gid}/students`, { student_ids: studentIds }, { headers: authHeaders() });
      setStudentsModal(false);
      await load();
      setNotice({ tone: 'success', text: 'Состав группы обновлён' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось добавить учеников') });
    }
  };

  const handleUnassign = async (testId) => {
    if (!window.confirm('Снять этот тест со всей группы? Индивидуальные назначения не изменятся.')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${groupId}/assignments/${testId}`, { headers: authHeaders() });
      await load();
      setNotice({ tone: 'success', text: 'Тест снят с группы' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось снять тест') });
    }
  };

  const handleAssign = async (testId, gid) => {
    await axios.post(`${API_BASE}/teacher/assign-test-to-group`, { test_id: testId, group_id: gid }, { headers: authHeaders() });
    await load();
    setNotice({ tone: 'success', text: 'Тест назначен группе' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center flex-col gap-6">
        <LayoutDashboard size={48} className="text-zinc-300 dark:text-zinc-700" />
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{error || 'Ошибка загрузки'}</div>
        <button
          type="button"
          onClick={() => navigate('/teacher/groups')}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium text-zinc-600 dark:text-zinc-300"
        >
          <ChevronLeft size={14} /> Назад к группам
        </button>
      </div>
    );
  }

  const members = group.students || [];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] pb-20">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        <button
          type="button"
          onClick={() => navigate('/teacher/groups')}
          className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-medium transition-all"
        >
          <div className="p-2 bg-white dark:bg-[#09090b] rounded-lg border border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-700 shadow-sm">
            <ChevronLeft size={14} />
          </div>
          Назад к группам
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-3">
            <span className="text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-3 py-1.5 rounded-full">
              Группа
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              {group.name}
            </h1>
            {group.description ? (
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg max-w-xl">{group.description}</p>
            ) : null}
            <p className="text-sm text-zinc-500 tabular-nums">{members.length} учеников</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#09090b] p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
            <div className="text-right">
              <div className="text-xs font-medium text-zinc-400 mb-1">Назначено</div>
              <div className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{assignedCount}</div>
            </div>
            <div className="hidden sm:block w-px bg-zinc-200 dark:bg-zinc-800 h-12 self-center" />
            <div className="text-right">
              <div className="text-xs font-medium text-zinc-400 mb-1">Сдано</div>
              <div className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{completedCount}</div>
            </div>
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-medium text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2 self-center"
            >
              <Send size={14} /> Назначить тест
            </button>
          </div>
        </header>

        {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 pb-4 flex items-center justify-between gap-3">
                <h3 className="font-medium text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Users size={14} className="text-zinc-700 dark:text-zinc-300" /> Ученики
                </h3>
                <button
                  type="button"
                  onClick={() => setStudentsModal(true)}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Состав
                </button>
              </div>
              {members.length === 0 ? (
                <div className="px-6 md:px-8 pb-10 flex flex-col items-center text-center gap-2">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                    <Users size={20} />
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Нет учеников</p>
                  <p className="text-sm text-zinc-500">Добавьте состав через кнопку выше</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {members.map((student) => (
                    <li key={student.id} className="px-6 md:px-8 py-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/students/${student.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-zinc-400">@{student.username}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/stats/${student.id}`)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Статистика"
                      >
                        <Trophy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(group.id, student.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Убрать из группы"
                      >
                        <XCircle size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden min-h-[28rem] flex flex-col">
              <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex gap-1 p-1 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 w-fit">
                  <button
                    type="button"
                    onClick={() => setTab('assigned')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      tab === 'assigned'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500'
                    }`}
                  >
                    Назначенные
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('solved')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      tab === 'solved'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-500'
                    }`}
                  >
                    Решённые
                  </button>
                </div>
              </div>

              {tab === 'assigned' && (
                testsList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center gap-2 px-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                      <BookOpen size={20} />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Нет назначенных тестов</p>
                    <p className="text-sm text-zinc-500">Назначьте тест группе справа в шапке</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {testsList.map((test) => {
                      const students = test.students || [];
                      const done = students.filter((s) => s.is_completed).length;
                      const total = students.length;
                      return (
                        <li key={test.test_id} className="px-6 md:px-8 py-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{test.test_title}</p>
                              <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                                {done}/{total} · {formatDate(test.assigned_at)}
                                {test.due_date ? ` · до ${formatDate(test.due_date)}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {done > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/groups/${groupId}/tests/${test.test_id}`)}
                                  className="px-3 py-1.5 text-xs font-medium rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center gap-1"
                                >
                                  <FileText size={12} /> Разбор группой
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleUnassign(test.test_id)}
                                className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Снять со всей группы"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-zinc-900 dark:bg-white rounded-full"
                              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="space-y-1">
                            {students.map((s) => (
                              <div key={s.user_id} className="flex items-center justify-between gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/students/${s.user_id}`)}
                                  className="font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 truncate"
                                >
                                  {studentName(s)}
                                </button>
                                {s.is_completed ? (
                                  <button
                                    type="button"
                                    onClick={() => s.result_id && navigate(`/teacher/results/${s.result_id}`)}
                                    className="tabular-nums text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                                  >
                                    {s.total_points ?? 0}/{test.max_points ?? 0}
                                    <ArrowRight size={12} />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-zinc-400">
                                    <Clock size={12} /> Ждёт
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {tab === 'solved' && (
                solvedRows.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center gap-2 px-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Пока никто не сдал</p>
                    <p className="text-sm text-zinc-500">Результаты появятся после завершения попыток</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/80 dark:bg-zinc-900/40">
                          <th className="px-6 md:px-8 py-4 text-xs font-medium text-zinc-500">Тест</th>
                          <th className="px-6 md:px-8 py-4 text-xs font-medium text-zinc-500">Ученик</th>
                          <th className="px-6 md:px-8 py-4 text-xs font-medium text-zinc-500 text-center">Балл</th>
                          <th className="px-6 md:px-8 py-4 text-xs font-medium text-zinc-500">Дата</th>
                          <th className="px-6 md:px-8 py-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {solvedRows.map((row) => (
                          <tr
                            key={row.key}
                            onClick={() => navigate(`/teacher/results/${row.resultId}`)}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer group"
                          >
                            <td className="px-6 md:px-8 py-5 text-sm font-medium text-zinc-800 dark:text-zinc-200">{row.testTitle}</td>
                            <td className="px-6 md:px-8 py-5 text-sm text-zinc-600 dark:text-zinc-300">{row.student}</td>
                            <td className="px-6 md:px-8 py-5 text-center tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                              {row.score ?? '—'}{row.max != null ? `/${row.max}` : ''}
                            </td>
                            <td className="px-6 md:px-8 py-5 text-xs text-zinc-500">{formatDate(row.date)}</td>
                            <td className="px-6 md:px-8 py-5 text-right">
                              <div className="inline-flex w-10 h-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-950">
                                <ArrowRight size={16} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}
