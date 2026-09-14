import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, FileText, Users } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { InlineNotice, MarkdownRenderer, ThemeToggle, formatApiDetail } from '../../shared/ui';

function authHeaders() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    const token = session?.token || session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function displayName(row) {
  if (row.student_name) return row.student_name;
  const n = [row.first_name, row.last_name].filter(Boolean).join(' ');
  return n || `ID ${row.student_id || row.user_id}`;
}

function taskKey(task) {
  return task.task_id ?? task.id;
}

function clusterAnswers(answers, taskId) {
  const rows = (answers || []).filter((a) => (a.task_id ?? a.id) === taskId);
  const map = new Map();
  for (const row of rows) {
    const key = String(row.user_answer ?? '');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}

export default function TeacherGroupTestReviewContent() {
  const { groupId, testId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${API_BASE}/teacher/groups/${groupId}/tests/${testId}/review`,
          { headers: authHeaders() }
        );
        setData(res.data);
        setIndex(0);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError(formatApiDetail(err.response?.data?.detail, 'Не удалось загрузить разбор'));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [groupId, testId, navigate]);

  const tasks = data?.tasks || [];
  const task = tasks[index] || null;
  const clusters = useMemo(
    () => (task ? clusterAnswers(data?.answers, taskKey(task)) : []),
    [task, data?.answers]
  );
  const notSubmitted = data?.not_submitted || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center flex-col gap-6 p-6">
        <FileText size={48} className="text-zinc-300 dark:text-zinc-700" />
        <InlineNotice tone="error">{error || 'Разбор недоступен'}</InlineNotice>
        <button
          type="button"
          onClick={() => navigate(`/teacher/groups/${groupId}`)}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium"
        >
          <ChevronLeft size={14} /> К группе
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] pb-20">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        <button
          type="button"
          onClick={() => navigate(`/teacher/groups/${groupId}`)}
          className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-medium"
        >
          <div className="p-2 bg-white dark:bg-[#09090b] rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <ChevronLeft size={14} />
          </div>
          Назад к группе
        </button>

        <header className="space-y-2">
          <span className="text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-3 py-1.5 rounded-full">
            Разбор группой
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {data.test_title || data.title || 'Тест'}
          </h1>
          <p className="text-sm text-zinc-500">
            {data.group_name ? `${data.group_name} · ` : ''}
            {tasks.length} заданий
          </p>
        </header>

        {notSubmitted.length > 0 ? (
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] p-6">
            <h2 className="text-xs font-medium text-zinc-500 flex items-center gap-2 mb-3">
              <Users size={14} /> Не сдали ({notSubmitted.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {notSubmitted.map((s) => (
                <span
                  key={s.student_id || s.user_id}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  {displayName(s)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {task ? (
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                Задание {index + 1} из {tasks.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={index >= tasks.length - 1}
                  onClick={() => setIndex((i) => Math.min(tasks.length - 1, i + 1))}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 md:px-8 py-6 space-y-6">
              <div className="prose prose-zinc dark:prose-invert max-w-none text-sm">
                <MarkdownRenderer>{task.content || task.statement || ''}</MarkdownRenderer>
              </div>

              {task.correct_answer != null && String(task.correct_answer).length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Эталон</p>
                  <div className="text-sm text-zinc-800 dark:text-zinc-200">
                    <MarkdownRenderer>{String(task.correct_answer)}</MarkdownRenderer>
                  </div>
                </div>
              ) : null}

              {task.solution ? (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Решение</p>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    <MarkdownRenderer>{task.solution}</MarkdownRenderer>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-3">Ответы группы</p>
                {clusters.length === 0 ? (
                  <p className="text-sm text-zinc-500">Нет сданных ответов по этому заданию</p>
                ) : (
                  <div className="space-y-3">
                    {clusters.map(([answer, people]) => {
                      const correct = people.some((p) => p.is_correct);
                      return (
                        <div
                          key={answer}
                          className={`rounded-2xl border p-4 ${
                            correct
                              ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40'
                              : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="text-sm text-zinc-800 dark:text-zinc-200 mb-3">
                            <MarkdownRenderer>{answer || '—'}</MarkdownRenderer>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {people.map((p) => (
                              <button
                                key={`${p.student_id}-${p.result_id}`}
                                type="button"
                                onClick={() => p.result_id && navigate(`/teacher/results/${p.result_id}`)}
                                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                              >
                                {displayName(p)}
                                {p.points_earned != null ? ` · ${p.points_earned}` : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">В тесте нет заданий</p>
        )}
      </div>
    </div>
  );
}
