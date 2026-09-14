import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Search, XCircle, CheckCircle2, Clock, BookOpen, FileText } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';
import { InlineNotice, formatApiDetail, fieldClass, secondaryBtnClass } from '../../shared/ui';

function authHeaders() {
  const user = restoreSession();
  const token = user?.token || user?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function studentName(row) {
  if (row.student_name) return row.student_name;
  const n = [row.first_name, row.last_name].filter(Boolean).join(' ');
  return n || `ID ${row.user_id}`;
}

export default function AssignTestToGroupModal({ group, tests, onClose, onAssign, navigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchAssignments = useCallback(async () => {
    if (!group?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/teacher/groups/${group.id}/assignments`, {
        headers: authHeaders(),
      });
      setPayload(res.data);
    } catch (e) {
      setNotice({ tone: 'error', text: formatApiDetail(e.response?.data?.detail, 'Не удалось загрузить назначения') });
    } finally {
      setLoading(false);
    }
  }, [group?.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const assignedTests = payload?.tests || [];
  const assignedIds = useMemo(() => new Set(assignedTests.map((t) => t.test_id)), [assignedTests]);
  const availableTests = (tests || []).filter((t) => !assignedIds.has(t.id));
  const filteredAvailable = availableTests.filter((t) =>
    (t.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async (testId) => {
    setBusyId(testId);
    setNotice(null);
    try {
      await onAssign(testId, group.id);
      await fetchAssignments();
    } catch (e) {
      setNotice({ tone: 'error', text: formatApiDetail(e.response?.data?.detail, 'Не удалось назначить тест') });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnassign = async (testId) => {
    if (!window.confirm('Снять этот тест со всей группы? Индивидуальные назначения не изменятся.')) return;
    setBusyId(testId);
    setNotice(null);
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${group.id}/assignments/${testId}`, {
        headers: authHeaders(),
      });
      await fetchAssignments();
      setNotice({ tone: 'success', text: 'Тест снят с группы' });
    } catch (e) {
      setNotice({ tone: 'error', text: formatApiDetail(e.response?.data?.detail, 'Не удалось снять тест') });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Назначить тест
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {group.name} · {group.students?.length || group.students_count || 0} учеников
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

          {loading ? (
            <p className="text-sm text-zinc-500 text-center py-8">Загрузка назначений…</p>
          ) : assignedTests.length > 0 ? (
            <div>
              <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} />
                Назначенные ({assignedTests.length})
              </h4>
              <div className="space-y-2">
                {assignedTests.map((test) => {
                  const students = test.students || [];
                  const done = students.filter((s) => s.is_completed).length;
                  const total = students.length || 1;
                  return (
                    <div
                      key={test.test_id}
                      className="rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h5 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {test.test_title}
                          </h5>
                          <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                            {test.total_tasks ?? 0} зад. · {done}/{students.length}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === test.test_id}
                          onClick={() => handleUnassign(test.test_id)}
                          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 disabled:opacity-50"
                        >
                          Снять
                        </button>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-zinc-900 dark:bg-white rounded-full"
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      </div>
                      <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
                        {students.map((row) => (
                          <div
                            key={row.user_id}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/70 dark:bg-zinc-950/40"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {row.is_completed
                                ? <CheckCircle2 size={12} className="text-zinc-500 shrink-0" />
                                : <Clock size={12} className="text-zinc-500 shrink-0" />}
                              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                {studentName(row)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {row.is_completed ? (
                                <>
                                  <span className="text-[11px] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                                    {row.total_points ?? 0}/{test.max_points ?? 0}
                                  </span>
                                  {row.result_id && navigate ? (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/teacher/results/${row.result_id}`)}
                                      className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                      <FileText size={12} />
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-[11px] text-zinc-500">Ждёт</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
              <BookOpen size={14} />
              Доступные ({availableTests.length})
            </h4>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Поиск теста..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${fieldClass} pl-9`}
              />
            </div>
            {filteredAvailable.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">
                {searchTerm ? 'Ничего не найдено' : 'Все тесты назначены'}
              </p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredAvailable.map((test) => (
                  <button
                    type="button"
                    key={test.id}
                    disabled={busyId === test.id}
                    onClick={() => handleAssign(test.id)}
                    className="w-full p-3 text-left rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all disabled:opacity-50"
                  >
                    <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{test.title}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {test.tasks?.length || 0} заданий
                      {test.target_class ? ` · ${test.target_class} класс` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/60">
          <button type="button" onClick={onClose} className={`${secondaryBtnClass} w-full justify-center py-3`}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
