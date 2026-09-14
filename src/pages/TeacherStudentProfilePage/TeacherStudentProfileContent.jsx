import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../shared/api';
import { InlineNotice, formatApiDetail } from '../../shared/ui';
import {
  ChevronLeft, Phone, MessageSquare, History, ArrowRight, Trophy, Target,
  Calendar, Search, BarChart3, Shield, Clock, CheckCircle2, ListTodo, Trash2,
} from 'lucide-react';

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

export default function TeacherStudentProfileContent() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = authHeaders();
        const [profileRes, historyRes, assignmentsRes] = await Promise.all([
          axios.get(`${API_BASE}/teacher/students-profile/${userId}`, { headers }),
          axios.get(`${API_BASE}/teacher/students-history/${userId}`, { headers }),
          axios.get(`${API_BASE}/teacher/student/${userId}/assignments`, { headers }),
        ]);
        setData(profileRes.data);
        setHistory(historyRes.data || []);
        setAssignments(assignmentsRes.data || []);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError(
          err.response?.status === 404
            ? 'Ученик не найден'
            : 'Не удалось загрузить профиль'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, navigate]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const q = searchTerm.toLowerCase();
    return history.filter((item) => (item.test_title || '').toLowerCase().includes(q));
  }, [history, searchTerm]);

  const sortedAssignments = useMemo(() => (
    [...assignments].sort((a, b) => Number(!!a.is_completed) - Number(!!b.is_completed))
  ), [assignments]);

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Отменить назначение теста?')) return;
    try {
      const headers = authHeaders();
      await axios.delete(`${API_BASE}/teacher/assignments/${assignmentId}`, { headers });
      const res = await axios.get(`${API_BASE}/teacher/student/${userId}/assignments`, { headers });
      setAssignments(res.data || []);
      setNotice({ tone: 'success', text: 'Назначение снято' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Не удалось отменить назначение') });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center flex-col gap-6">
        <Shield size={48} className="text-red-300 dark:text-red-500/40" />
        <div className="text-lg font-semibold text-red-600 dark:text-red-400">{error || 'Ошибка загрузки'}</div>
        <button
          type="button"
          onClick={() => navigate('/teacher/students')}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
          <ChevronLeft size={14} /> Назад к ученикам
        </button>
      </div>
    );
  }

  const user = data.user || data;
  const stats = data.stats || null;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] pb-20">
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        <button
          type="button"
          onClick={() => navigate('/teacher/students')}
          className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-medium transition-all"
        >
          <div className="p-2 bg-white dark:bg-[#09090b] rounded-lg border border-zinc-200 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-700 shadow-sm">
            <ChevronLeft size={14} />
          </div>
          Назад к ученикам
        </button>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-3 py-1.5 rounded-full">
                Ученик
              </span>
              <span className="text-xs font-medium text-zinc-400 tabular-nums">ID: {user.id}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              {user.first_name}{' '}
              <span className="text-zinc-500 dark:text-zinc-400">{user.last_name}</span>
            </h1>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium text-lg">@{user.username}</div>
          </div>

          {stats && (
            <div className="flex gap-6 md:gap-10 bg-white dark:bg-[#09090b] p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
              <button
                type="button"
                onClick={() => navigate(`/stats/${user.id}`)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 rounded-xl font-medium text-xs hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                <BarChart3 size={14} /> Статистика
              </button>
              <div className="text-right">
                <div className="text-xs font-medium text-zinc-400 mb-1">Средний результат</div>
                <div className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                  {stats.avg_score}<span className="text-zinc-500 text-xl">%</span>
                </div>
              </div>
              <div className="w-px bg-zinc-200 dark:bg-zinc-800 h-12 self-center" />
              <div className="text-right">
                <div className="text-xs font-medium text-zinc-400 mb-1">Попытки</div>
                <div className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{stats.total_attempts}</div>
              </div>
            </div>
          )}
        </header>

        {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="p-8 bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm space-y-8">
              <h3 className="font-medium text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Target size={14} className="text-zinc-700 dark:text-zinc-300" /> Контакты
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-all">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-400">Телефон</div>
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{user.phone || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-all">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-400">Telegram</div>
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{user.tg_username ? `@${user.tg_username}` : 'Не привязан'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 pb-4 flex items-center justify-between gap-3">
                <h3 className="font-medium text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <ListTodo size={14} className="text-zinc-700 dark:text-zinc-300" /> Назначенные тесты
                </h3>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-full tabular-nums">
                  {assignments.length}
                </span>
              </div>
              {assignments.length === 0 ? (
                <div className="px-6 md:px-8 pb-8">
                  <p className="text-sm text-zinc-400">Нет назначений</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {sortedAssignments.map((item) => {
                    const done = !!item.is_completed;
                    return (
                      <li key={item.id} className="px-6 md:px-8 py-4 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.test_title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {done ? (
                              <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Выполнен</span>
                            ) : (
                              <span className="inline-flex items-center gap-1"><Clock size={12} /> Ожидается</span>
                            )}
                            {item.due_date ? <span>до {formatDate(item.due_date)}</span> : null}
                            {item.percentage != null ? <span className="tabular-nums">{item.percentage}%</span> : null}
                            {done && item.total_points != null ? (
                              <span className="tabular-nums">{item.total_points}/{item.max_points || 0}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                          {done && item.result_id ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/teacher/results/${item.result_id}`)}
                              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Открыть результат"
                            >
                              <ArrowRight size={14} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(item.id)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Отменить назначение"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-medium opacity-60">Статус</div>
                <div className="text-xl font-semibold mt-1">Активен</div>
              </div>
              <Trophy size={32} className="opacity-20" />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-3 text-zinc-900 dark:text-zinc-100">
                    <History size={20} /> История решений
                  </h2>
                  <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {filteredHistory.length} сессий
                  </div>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <History size={40} className="text-zinc-200 dark:text-zinc-700 mb-4" />
                    <p className="text-sm font-medium text-zinc-400">
                      {searchTerm ? 'Ничего не найдено' : 'История тестов пуста'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80 dark:bg-zinc-900/40">
                        <th className="px-8 py-5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Тест</th>
                        <th className="px-8 py-5 text-xs font-medium text-zinc-500 dark:text-zinc-400 text-center">Балл</th>
                        <th className="px-8 py-5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Дата</th>
                        <th className="px-8 py-5 text-right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {filteredHistory.map((item) => {
                        const result = item.result || item;
                        const score = result.total_points ?? item.score ?? 0;
                        return (
                          <tr
                            key={result.id || item.id}
                            onClick={() => {
                              const rid = result.id || item.result_id;
                              if (rid) navigate(`/teacher/results/${rid}`);
                            }}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-all group"
                          >
                            <td className="px-8 py-6">
                              <div className="font-medium text-zinc-800 dark:text-zinc-200 text-sm group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                                {item.test_title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim() || 'Без названия'}
                              </div>
                              <div className="text-xs font-medium text-zinc-400 mt-1 tabular-nums">
                                ID {result.id || item.id}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className={`text-lg font-semibold tabular-nums ${
                                score >= 80 ? 'text-green-600 dark:text-green-400'
                                  : score >= 50 ? 'text-zinc-700 dark:text-zinc-300'
                                    : 'text-red-600 dark:text-red-400'
                              }`}>
                                {result.total_points ?? item.score ?? '—'}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Calendar size={12} />
                                <span className="text-xs font-medium whitespace-nowrap">
                                  {formatDate(result.completed_at || item.completed_at)}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all shadow-sm">
                                <ArrowRight size={16} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
