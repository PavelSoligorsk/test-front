import React from 'react';
import { Eye, AlertCircle, Trash2, Hash } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';

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

const getUpdateFields = (item) => {
  const fields = [];
  const add = (key, label, type) => {
    if (item[key] !== undefined && item[key] !== null) fields.push({ key, label, value: item[key], type });
  };
  add('task_class', 'Класс', 'text');
  add('topic_number', 'Тема №', 'text');
  add('topic', 'Тема', 'text');
  add('section', 'Раздел', 'text');
  add('difficulty', 'Сложность', 'text');
  add('is_open_answer', 'Тип', 'open');
  add('answer', 'Ответ', 'text');
  add('content', 'Условие', 'markdown');
  add('hint', 'Подсказка', 'markdown');
  add('solution', 'Решение', 'markdown');
  add('options', 'Варианты ответа', 'options');
  return fields;
};

export default function BatchPreview({ mode, parsed, error, hasText }) {
  const countLabel = mode === 'delete' ? 'ID' : 'заданий';

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Delete preview */}
      {hasText && !error && parsed && mode === 'delete' && (
        <div className="bg-white rounded-[2rem] border border-red-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-red-500" />
              <h4 className="text-sm font-black text-red-700 uppercase">Удаление заданий</h4>
            </div>
            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-xl text-xs font-black">{parsed.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.map(id => (
              <span key={id} className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-700">#{id}</span>
            ))}
          </div>
        </div>
      )}

      {/* Create preview */}
      {hasText && !error && parsed && mode === 'create' && (
        <div className="space-y-4">
          {parsed.map((task, i) => {
            const isClosed = task.is_open_answer === false;
            return (
              <div key={i} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <MetaBadge label="№" value={i + 1} color="bg-blue-50 text-blue-600" />
                  {task.task_class && <MetaBadge label="Класс" value={task.task_class} />}
                  {task.topic_number && <MetaBadge label="Тема №" value={task.topic_number} />}
                  {task.difficulty && <MetaBadge label="Сложность" value={task.difficulty} />}
                  {task.topic && <MetaBadge label="Тема" value={task.topic} color="bg-violet-50 text-violet-600" />}
                  {task.section && <MetaBadge label="Раздел" value={task.section} color="bg-violet-50 text-violet-600" />}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${isClosed ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isClosed ? 'Тест' : 'Открытый'}
                  </span>
                </div>

                <MarkdownPreview text={task.content} title={`Задание ${i + 1}`} />

                {isClosed && parseOptions(task.options).length > 0 && (
                  <MarkdownPreview title="Варианты ответа" text={optionsToMarkdown(task.options)} />
                )}

                {task.hint && <MarkdownPreview text={`> **Подсказка:** ${task.hint}`} title="Hint" type="hint" />}

                {task.solution && <MarkdownPreview text={task.solution} title="Решение" type="solution" />}

                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ответ: </span>
                  <span className="text-sm font-black text-emerald-800">{task.answer}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update preview */}
      {hasText && !error && parsed && mode === 'update' && (
        <div className="space-y-4">
          {parsed.map((item, i) => {
            const fields = getUpdateFields(item);
            return (
              <div key={i} className="bg-white rounded-[2rem] border border-amber-200 shadow-sm p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Hash size={14} className="text-amber-500" />
                  <span className="text-sm font-black text-slate-800 uppercase">Задание #{item.id}</span>
                  <span className="text-[10px] font-bold text-slate-400">{fields.length} полей</span>
                </div>

                {fields.length === 0 && (
                  <p className="text-xs font-bold text-slate-400">Поля для обновления не указаны</p>
                )}

                {fields.map(field => (
                  <div key={field.key} className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</span>
                    {field.type === 'markdown' ? (
                      <MarkdownPreview text={field.value} title={field.label} />
                    ) : field.type === 'options' ? (
                      <MarkdownPreview title="Варианты ответа" text={optionsToMarkdown(field.value)} />
                    ) : field.type === 'open' ? (
                      <span className={`text-xs font-black uppercase ${field.value ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {field.value ? 'Открытый' : 'Тест'}
                      </span>
                    ) : (
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 whitespace-pre-wrap break-words">
                        {field.key === 'difficulty' ? `Уровень ${field.value}` : String(field.value)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}