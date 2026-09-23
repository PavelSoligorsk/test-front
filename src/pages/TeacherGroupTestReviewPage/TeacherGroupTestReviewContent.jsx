import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, FileText, Users } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { InlineNotice, MarkdownRenderer, QuestionMap, ThemeToggle, formatApiDetail } from '../../shared/ui';

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

function taskOptions(task) {
  const raw = task?.options;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(';');
  return list.map((opt) => String(opt).trim()).filter(Boolean);
}

function isClosedTask(task, options) {
  const flag = task?.is_open_answer;
  if (flag === false || flag === 0 || flag === 'false') return true;
  if (flag === true || flag === 1 || flag === 'true') return false;
  return options.length > 0;
}

function correctKeys(task) {
  const raw = task?.correct_answer ?? task?.answer ?? '';
  return String(raw).split(',').map((part) => part.trim()).filter(Boolean);
}

function sameAnswer(left, right) {
  const norm = (value) => String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join(',');
  return norm(left) !== '' && norm(left) === norm(right);
}

function optionIsCorrect(opt, index, keys) {
  return keys.includes(String(index + 1)) || keys.includes(opt);
}

function answerLabel(answer, options) {
  if (!options.length) return answer || '—';
  const parts = String(answer ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return '—';
  return parts.map((part) => {
    const n = Number(part);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1];
    return part;
  }).join(', ');
}

function correctLabel(task, options) {
  const keys = correctKeys(task);
  if (!keys.length) return '';
  if (!options.length) return keys.join(', ');
  const labels = options.filter((opt, i) => optionIsCorrect(opt, i, keys));
  return labels.length ? labels.join(', ') : keys.join(', ');
}

function withCorrectCluster(clusters, task, options) {
  if (!isClosedTask(task, options)) return clusters;
  const keys = correctKeys(task);
  if (!keys.length) return clusters;
  const correctKey = [...keys].sort().join(',');
  if (clusters.some(([answer]) => sameAnswer(answer, correctKey))) return clusters;
  return [[correctKey, []], ...clusters];
}

function TaskBlock({ index, total, task, clusters, navigate }) {
  const id = taskKey(task);
  const options = taskOptions(task);
  const closed = isClosedTask(task, options);
  const keys = correctKeys(task);
  const correctText = correctLabel(task, options);
  const shownClusters = withCorrectCluster(clusters, task, options);
  return (
    <article
      data-task-id={id}
      className="rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] overflow-hidden"
    >
      <div className="px-6 md:px-8 py-4 border-b border-zinc-100 dark:border-zinc-800/60">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
          Задание {index + 1} из {total}
        </p>
      </div>
      <div className="px-6 md:px-8 py-6 space-y-6">
        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm">
          <MarkdownRenderer>{task.content || task.statement || ''}</MarkdownRenderer>
        </div>

        {closed && options.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-3">Варианты</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((opt, i) => {
                const correct = optionIsCorrect(opt, i, keys);
                return (
                  <div
                    key={`${id}-opt-${i}`}
                    className={`p-4 rounded-2xl border text-sm font-medium flex gap-3 ${
                      correct
                        ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="opacity-40 tabular-nums">{i + 1}.</span>
                    <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {correctText ? (
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Эталонный ответ</p>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <MarkdownRenderer>{correctText}</MarkdownRenderer>
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
          {shownClusters.length === 0 ? (
            <p className="text-sm text-zinc-500">Нет сданных ответов по этому заданию</p>
          ) : (
            <div className="space-y-3">
              {shownClusters.map(([answer, people]) => {
                const isCorrectCluster = people.some((p) => p.is_correct) || sameAnswer(answer, keys.join(','));
                return (
                  <div
                    key={answer}
                    className={`rounded-2xl border p-4 ${
                      isCorrectCluster
                        ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10'
                        : 'border-red-300 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-3 ${
                      isCorrectCluster
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      <MarkdownRenderer>{answerLabel(answer, options)}</MarkdownRenderer>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {people.length === 0 ? (
                        <span className="text-xs text-emerald-700/80 dark:text-emerald-300/80">Никто не выбрал</span>
                      ) : null}
                      {people.map((p) => (
                        <button
                          key={`${p.student_id}-${p.result_id}`}
                          type="button"
                          onClick={() => p.result_id && navigate(`/teacher/results/${p.result_id}`)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                            p.is_correct
                              ? 'bg-white/80 dark:bg-zinc-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                              : 'bg-white/80 dark:bg-zinc-950/40 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300'
                          }`}
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
    </article>
  );
}

export default function TeacherGroupTestReviewContent() {
  const { groupId, testId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const clustersByTask = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      map.set(taskKey(task), clusterAnswers(data?.answers, taskKey(task)));
    }
    return map;
  }, [tasks, data?.answers]);
  const groupStats = useMemo(
    () => tasks.map((task) => {
      const rows = (data?.answers || []).filter((a) => (a.task_id ?? a.id) === taskKey(task));
      return {
        task_id: taskKey(task),
        correct: rows.filter((r) => r.is_correct).length,
        wrong: rows.filter((r) => !r.is_correct).length,
      };
    }),
    [tasks, data?.answers]
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

        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">В тесте нет заданий</p>
        ) : (
          <div className="space-y-6">
            {tasks.map((task, i) => (
              <TaskBlock
                key={taskKey(task) ?? i}
                index={i}
                total={tasks.length}
                task={task}
                clusters={clustersByTask.get(taskKey(task)) || []}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
      {tasks.length > 0 ? (
        <QuestionMap
          mode="group"
          groupStats={groupStats}
          onScroll={(taskId) => {
            const el = document.querySelector(`[data-task-id="${taskId}"]`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      ) : null}
    </div>
  );
}
