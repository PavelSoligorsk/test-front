import React, { useState } from 'react';
import { Layers, Upload, Edit3, Trash2, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { createTasksBatch, updateTasksBatch, deleteTasksBatch } from './api';
import BatchPromptModal from './BatchPromptModal';

const EXAMPLE_CREATE = `[
  {
    "task_class": "10",
    "topic_number": "1.1",
    "content": "Решите уравнение \\\\(x^2 - 5x + 6 = 0\\\\)",
    "answer": "2; 3",
    "is_open_answer": true,
    "difficulty": 2,
    "topic": "Алгебра",
    "section": "Квадратные уравнения"
  },
  {
    "task_class": "10",
    "topic_number": "1.1",
    "content": "Сколько корней имеет уравнение \\\\(x^2 + 1 = 0\\\\)?",
    "options": ["0", "1", "2", "бесконечно"],
    "answer": "0",
    "is_open_answer": false,
    "difficulty": 1,
    "hint": "Вспомните дискриминант"
  }
]`;

const EXAMPLE_UPDATE = `[
  { "id": 1, "difficulty": 3, "topic": "Алгебра", "section": "Квадратные уравнения" },
  { "id": 2, "answer": "4", "hint": "Подумайте о дискриминанте" }
]`;

const EXAMPLE_DELETE = `[1, 2, 3, 4, 5]`;

export default function BatchTab({ onSuccess }) {
  const [mode, setMode] = useState('create'); // create | update | delete
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showExample, setShowExample] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const getExample = () => {
    if (mode === 'create') return EXAMPLE_CREATE;
    if (mode === 'update') return EXAMPLE_UPDATE;
    return EXAMPLE_DELETE;
  };

  const handleLoadExample = () => {
    setJsonText(getExample().trim());
    setError(null);
    setResult(null);
  };

  const validateJSON = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (mode === 'delete') {
        if (!Array.isArray(parsed)) throw new Error('Должен быть массив чисел (ID заданий)');
        if (parsed.length === 0) throw new Error('Массив ID не может быть пустым');
        for (const id of parsed) {
          if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
            throw new Error(`Некорректный ID: ${id}. Должны быть целые положительные числа.`);
          }
        }
        return parsed;
      }
      if (!Array.isArray(parsed)) throw new Error('Должен быть массив объектов');
      if (parsed.length === 0) throw new Error('Массив не может быть пустым');
      if (parsed.length > 500) throw new Error(`Максимум 500 заданий за раз, у вас ${parsed.length}`);
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (typeof item !== 'object' || item === null) {
          throw new Error(`Элемент [${i}]: должен быть объектом`);
        }
        if (mode === 'update') {
          if (!item.id || typeof item.id !== 'number' || !Number.isInteger(item.id)) {
            throw new Error(`Элемент [${i}]: отсутствует или некорректный id`);
          }
        } else {
          // create
          if (!item.task_class || !String(item.task_class).trim()) {
            throw new Error(`Элемент [${i}]: отсутствует task_class`);
          }
          if (!item.topic_number || !String(item.topic_number).trim()) {
            throw new Error(`Элемент [${i}]: отсутствует topic_number`);
          }
          if (!item.content || !String(item.content).trim()) {
            throw new Error(`Элемент [${i}]: отсутствует content`);
          }
          if (item.answer === undefined || item.answer === null || String(item.answer).trim() === '') {
            throw new Error(`Элемент [${i}]: отсутствует answer`);
          }
          if (item.is_open_answer === false && (!item.options || !Array.isArray(item.options) || item.options.length === 0)) {
            throw new Error(`Элемент [${i}]: для закрытого задания нужно options (массив вариантов)`);
          }
          if (item.difficulty !== undefined && (item.difficulty < 1 || item.difficulty > 5)) {
            throw new Error(`Элемент [${i}]: difficulty должно быть 1-5`);
          }
        }
      }
      return parsed;
    } catch (e) {
      if (e.message.includes('JSON')) throw e;
      throw e;
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    let parsed;
    try {
      parsed = validateJSON(jsonText);
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError(`Ошибка JSON: ${e.message}`);
      } else {
        setError(e.message);
      }
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'create') {
        res = await createTasksBatch(parsed);
        setResult({ type: 'create', data: res });
      } else if (mode === 'update') {
        res = await updateTasksBatch(parsed);
        setResult({ type: 'update', data: res });
      } else {
        res = await deleteTasksBatch(parsed);
        setResult({ type: 'delete', data: res });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || String(d)).join('\n'));
      } else if (detail) {
        setError(String(detail));
      } else {
        setError(err.message || 'Неизвестная ошибка');
      }
    } finally {
      setLoading(false);
    }
  };

  const modeLabel = mode === 'create' ? 'Создание' : mode === 'update' ? 'Обновление' : 'Удаление';
  const modeIcon = mode === 'create' ? Upload : mode === 'update' ? Edit3 : Trash2;
  const modeColor = mode === 'create'
    ? 'from-emerald-600 to-teal-600'
    : mode === 'update'
      ? 'from-amber-600 to-orange-600'
      : 'from-red-600 to-rose-600';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${modeColor} rounded-xl flex items-center justify-center`}>
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter">
                Пакетные операции
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {modeLabel} до 500 заданий за раз
              </p>
            </div>
          </div>
            {/* Prompt */}
            <button
              onClick={() => setPromptModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 rounded-xl text-[10px] font-black uppercase transition-all"
              title="Показать AI-промпт классификации"
            >
              <MessageSquare size={12} /> Промпт
            </button>
            {/* Mode switcher */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'create', label: 'Создать', icon: Upload },
              { id: 'update', label: 'Обновить', icon: Edit3 },
              { id: 'delete', label: 'Удалить', icon: Trash2 },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  mode === m.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <m.icon size={14} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* JSON Input */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              JSON {mode === 'delete' ? '(массив ID)' : '(массив заданий)'}
            </span>
            {jsonText && (
              <span className="text-[9px] font-bold text-slate-400">
                {jsonText.split('\n').length} строк
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExample(!showExample)}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Пример
              {showExample ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={handleLoadExample}
              className="px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
            >
              Загрузить пример
            </button>
        </div>
      </div>

      {/* Prompt Modal */}
      {promptModalOpen && (
        <BatchPromptModal
          onClose={() => setPromptModalOpen(false)}
        />
      )}

        {/* Example panel */}
        {showExample && (
          <div className="rounded-2xl bg-slate-900 p-5 font-mono text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
            {getExample().trim()}
          </div>
        )}

        <textarea
          value={jsonText}
          onChange={e => { setJsonText(e.target.value); setError(null); setResult(null); }}
          placeholder={mode === 'delete'
            ? '[1, 2, 3, ...]'
            : '[\n  { "task_class": "10", "topic_number": "1.1", ... },\n  ...\n]'}
          className="w-full h-72 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y placeholder:text-slate-400"
          spellCheck={false}
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !jsonText.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase transition-all ${
            loading
              ? 'bg-slate-200 text-slate-400 cursor-wait'
              : `bg-gradient-to-r ${modeColor} text-white hover:shadow-lg active:scale-[0.98]`
          }`}
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Обработка...</>
          ) : (
            <><modeIcon size={18} /> {modeLabel} задания</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-red-700 uppercase mb-1">Ошибка</h4>
            <pre className="text-xs text-red-600 font-mono whitespace-pre-wrap leading-relaxed">{error}</pre>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-emerald-700 uppercase mb-2">Готово</h4>
            {result.type === 'create' && (
              <p className="text-xs font-bold text-emerald-600">
                Создано: <span className="text-emerald-800 text-lg font-black">{result.data.total}</span> заданий
              </p>
            )}
            {result.type === 'update' && (
              <div className="space-y-1 text-xs font-bold text-emerald-600">
                <p>Обновлено: <span className="text-emerald-800 font-black">{result.data.total_updated}</span></p>
                {result.data.not_found?.length > 0 && (
                  <p className="text-amber-600">
                    Не найдено: <span className="text-amber-800 font-black">{result.data.not_found.length}</span>
                    <span className="text-[10px] ml-2">({result.data.not_found.join(', ')})</span>
                  </p>
                )}
              </div>
            )}
            {result.type === 'delete' && (
              <div className="space-y-1 text-xs font-bold text-emerald-600">
                <p>Удалено: <span className="text-emerald-800 font-black">{result.data.total_deleted}</span></p>
                {result.data.not_found?.length > 0 && (
                  <p className="text-amber-600">
                    Не найдено: <span className="text-amber-800 font-black">{result.data.not_found.length}</span>
                    <span className="text-[10px] ml-2">({result.data.not_found.join(', ')})</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}