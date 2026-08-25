import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, Trash2, Hash, Loader2, Sparkles } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { adminApi } from '../../../shared/api/adminApi'; // Перепроверьте путь импорта к вашему adminApi

const MetaBadge = ({ label, value, color }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${color || 'bg-slate-100 text-slate-600'}`}>
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

  // Пакетная подгрузка данных заданий по ID через Promise.all(adminApi.getTask)
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
          adminApi.getTask(id)
            .then(res => ({ id, data: res.data }))
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Eye size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">Предпросмотр</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {!hasText || error || !parsed ? 'ожидание данных' : `${parsed.length} ${countLabel}`}
            </p>
          </div>
        </div>

        {loadingTasks && (
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 animate-pulse bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
            <Loader2 size={14} className="animate-spin" /> Подгрузка...
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasText && (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
          <Eye size={32} className="text-slate-200 mb-3" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-wider">Здесь будет предпросмотр</p>
          <p className="text-[11px] font-bold text-slate-300 mt-1">Введите JSON в поле слева</p>
        </div>
      )}

      {/* Error state */}
      {hasText && error && (
        <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex items-start gap-3 min-h-[200px]">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">Предпросмотр недоступен</h4>
            <pre className="text-[11px] text-red-600 font-mono whitespace-pre-wrap leading-relaxed break-words">{error}</pre>
          </div>
        </div>
      )}

      {/* DELETE PREVIEW */}
      {hasText && !error && parsed && mode === 'delete' && (
        <div className="space-y-4">
          {parsed.map((id) => {
            const task = fetchedTasks[id];
            const isClosed = task?.is_open_answer === false;

            return (
              <div key={id} className="bg-white rounded-[2rem] border-2 border-red-100 shadow-sm p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-red-50 pb-2">
                  <div className="flex items-center gap-2">
                    <Trash2 size={16} className="text-red-500" />
                    <span className="text-xs font-black text-red-700 uppercase">Задание #{id}</span>
                  </div>
                  {!task && !loadingTasks && (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
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
                      {task.topic && <MetaBadge label="Тема" value={task.topic} color="bg-slate-100 text-slate-600" />}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${isClosed ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isClosed ? 'Тест' : 'Открытый'}
                      </span>
                    </div>

                    <MarkdownPreview text={task.content} title={`Задание #${id}`} />

                    {isClosed && parseOptions(task.options).length > 0 && (
                      <MarkdownPreview title="Варианты ответа" text={optionsToMarkdown(task.options)} />
                    )}

                    {task.answer !== undefined && task.answer !== null && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">
                        Ответ: {task.answer}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-mono text-slate-400">Ожидание загрузки данных задания #{id}...</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & UPDATE PREVIEW */}
      {hasText && !error && parsed && (mode === 'create' || mode === 'update') && (
        <div className="space-y-4">
          {parsed.map((item, i) => {
            const original = mode === 'update' ? (fetchedTasks[item.id] || {}) : {};
            const task = mode === 'update' ? { ...original, ...item } : item;
            const isClosed = task.is_open_answer === false;

            return (
              <div key={i} className={`bg-white rounded-[2rem] border shadow-sm p-5 space-y-3 ${mode === 'update' ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <MetaBadge 
                    label={mode === 'update' ? "ID" : "№"} 
                    value={mode === 'update' ? `#${task.id}` : i + 1} 
                    color={mode === 'update' ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-600"} 
                  />
                  {task.task_class && <MetaBadge label="Класс" value={task.task_class} />}
                  {task.topic_number && <MetaBadge label="Тема №" value={task.topic_number} />}
                  {task.difficulty && <MetaBadge label="Сложность" value={task.difficulty} />}
                  {task.topic && <MetaBadge label="Тема" value={task.topic} color="bg-violet-50 text-violet-600" />}
                  {task.section && <MetaBadge label="Раздел" value={task.section} color="bg-violet-50 text-violet-600" />}
                  
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${isClosed ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isClosed ? 'Тест' : 'Открытый'}
                  </span>

                  {mode === 'update' && item.id && !fetchedTasks[item.id] && !loadingTasks && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[9px] font-black uppercase">
                      ID #{item.id} не найден
                    </span>
                  )}
                </div>

                {/* Content / Condition */}
                {task.content ? (
                  <div className="relative">
                    {mode === 'update' && item.content !== undefined && (
                      <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                        <Sparkles size={10} /> Изменено
                      </span>
                    )}
                    <MarkdownPreview text={task.content} title={`Задание ${task.id ? `#${task.id}` : i + 1}`} />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-400 font-bold">
                    Условие подгружается или отсутствует
                  </div>
                )}

                {/* Options */}
                {isClosed && parseOptions(task.options).length > 0 && (
                  <MarkdownPreview title="Варианты ответа" text={optionsToMarkdown(task.options)} />
                )}

                {/* Hints & Solutions */}
                {task.hint && <MarkdownPreview text={`> **Подсказка:** ${task.hint}`} title="Hint" type="hint" />}
                {task.solution && <MarkdownPreview text={task.solution} title="Решение" type="solution" />}

                {/* Answer */}
                {task.answer !== undefined && task.answer !== null && (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ответ: </span>
                      <span className="text-sm font-black text-emerald-800">{String(task.answer)}</span>
                    </div>
                    {mode === 'update' && item.answer !== undefined && (
                      <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md uppercase">
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