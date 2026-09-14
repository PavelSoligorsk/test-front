import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, Trash2, Loader2, Sparkles, Inbox } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { fetchTask } from './api';
import { IconWell, InlineNotice } from '../../shared/ui';

const MetaBadge = ({ label, value }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
    {label}: {value}
  </span>
);

const parseOptions = (options) =>
  (Array.isArray(options)
    ? options
    : typeof options === 'string'
      ? options.split(';').map(s => s.trim()).filter(Boolean)
      : []
  );

const optionsToMarkdown = (options) =>
  parseOptions(options).map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n');

export default function BatchPreview({ mode, parsed, error, hasText }) {
  const [fetchedTasks, setFetchedTasks] = useState({});
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (!hasText || error || !parsed || mode === 'create') {
      setFetchedTasks({});
      return;
    }

    const idsToFetch = mode === 'delete'
      ? parsed.filter(id => typeof id === 'number' && Number.isInteger(id))
      : parsed.map(item => item?.id).filter(id => typeof id === 'number' && Number.isInteger(id));

    if (idsToFetch.length === 0) {
      setFetchedTasks({});
      return;
    }

    let isMounted = true;
    setLoadingTasks(true);

    const fetchTasks = async () => {
      try {
        const uniqueIds = [...new Set(idsToFetch)];
        const requests = uniqueIds.map(id =>
          fetchTask(id)
            .then(data => ({ id, data }))
            .catch(() => ({ id, data: null }))
        );

        const results = await Promise.all(requests);

        if (!isMounted) return;

        const taskMap = {};
        results.forEach(({ id, data }) => {
          if (data) taskMap[id] = data;
        });

        setFetchedTasks(taskMap);
      } catch (err) {
        console.error('Ошибка подгрузки заданий:', err);
      } finally {
        if (isMounted) setLoadingTasks(false);
      }
    };

    fetchTasks();

    return () => { isMounted = false; };
  }, [parsed, mode, hasText, error]);

  const countLabel = mode === 'delete' ? 'к удалению' : 'заданий';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconWell><Eye size={18} strokeWidth={2} /></IconWell>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Предпросмотр</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {!hasText || error || !parsed ? 'Ожидание данных' : `${parsed.length} ${countLabel}`}
            </p>
          </div>
        </div>

        {loadingTasks && (
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Loader2 size={14} className="animate-spin" /> Подгрузка...
          </div>
        )}
      </div>

      {!hasText && (
        <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
            <Inbox size={20} />
          </div>
          <p className="text-sm font-medium text-zinc-500">Здесь будет предпросмотр</p>
          <p className="text-sm text-zinc-400 mt-1">Введите YAML в поле слева</p>
        </div>
      )}

      {hasText && error && (
        <div className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-6 flex items-start gap-3 min-h-[200px]">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <InlineNotice tone="error">Предпросмотр недоступен</InlineNotice>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap leading-relaxed break-words">{error}</pre>
          </div>
        </div>
      )}

      {hasText && !error && parsed && mode === 'delete' && (
        <div className="space-y-4">
          {parsed.map((id) => {
            const task = fetchedTasks[id];
            const isClosed = task?.is_open_answer === false;

            return (
              <div key={id} className="bg-white dark:bg-[#09090b] rounded-3xl border border-red-200 dark:border-red-900/40 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Trash2 size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Задание #{id}</span>
                  </div>
                  {!task && !loadingTasks && (
                    <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium">
                      Не найдено в базе
                    </span>
                  )}
                </div>

                {task ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {task.task_class && <MetaBadge label="Класс" value={task.task_class} />}
                      {task.topic_number && <MetaBadge label="Тема №" value={task.topic_number} />}
                      {task.difficulty && <MetaBadge label="Сложность" value={task.difficulty} />}
                      {task.topic && <MetaBadge label="Тема" value={task.topic} />}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                        {isClosed ? 'Тест' : 'Открытый'}
                      </span>
                    </div>

                    <MarkdownPreview text={task.content} title={`Задание #${id}`} />

                    {isClosed && parseOptions(task.options).length > 0 && (
                      <MarkdownPreview title="Варианты ответа" text={optionsToMarkdown(task.options)} />
                    )}

                    {task.answer !== undefined && task.answer !== null && (
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                        Ответ: {task.answer}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-zinc-400 font-mono">Ожидание загрузки данных задания #{id}...</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasText && !error && parsed && (mode === 'create' || mode === 'update') && (
        <div className="space-y-4">
          {parsed.map((item, i) => {
            const original = mode === 'update' ? (fetchedTasks[item.id] || {}) : {};
            const task = mode === 'update' ? { ...original, ...item } : item;
            const isClosed = task.is_open_answer === false;

            return (
              <div key={i} className={`bg-white dark:bg-[#09090b] rounded-3xl border shadow-sm p-5 space-y-3 ${
                mode === 'update' ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800/60'
              }`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <MetaBadge
                    label={mode === 'update' ? 'ID' : '№'}
                    value={mode === 'update' ? `#${task.id}` : i + 1}
                  />
                  {task.task_class && <MetaBadge label="Класс" value={task.task_class} />}
                  {task.topic_number && <MetaBadge label="Тема №" value={task.topic_number} />}
                  {task.difficulty && <MetaBadge label="Сложность" value={task.difficulty} />}
                  {task.topic && <MetaBadge label="Тема" value={task.topic} />}
                  {task.section && <MetaBadge label="Раздел" value={task.section} />}

                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                    {isClosed ? 'Тест' : 'Открытый'}
                  </span>

                  {mode === 'update' && item.id && !fetchedTasks[item.id] && !loadingTasks && (
                    <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-medium">
                      ID #{item.id} не найден
                    </span>
                  )}
                </div>

                {task.content ? (
                  <div className="relative">
                    {mode === 'update' && item.content !== undefined && (
                      <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-medium">
                        <Sparkles size={10} /> Изменено
                      </span>
                    )}
                    <MarkdownPreview text={task.content} title={`Задание ${task.id ? `#${task.id}` : i + 1}`} />
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-sm text-zinc-400 font-medium">
                    Условие подгружается или отсутствует
                  </div>
                )}

                {isClosed && parseOptions(task.options).length > 0 && (
                  <MarkdownPreview title="Варианты ответа" text={optionsToMarkdown(task.options)} />
                )}

                {task.hint && <MarkdownPreview text={`> **Подсказка:** ${task.hint}`} title="Подсказка" type="hint" />}
                {task.solution && <MarkdownPreview text={task.solution} title="Решение" type="solution" />}

                {task.answer !== undefined && task.answer !== null && (
                  <div className="rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-zinc-500">Ответ: </span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{String(task.answer)}</span>
                    </div>
                    {mode === 'update' && item.answer !== undefined && (
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                        Новый ответ
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
