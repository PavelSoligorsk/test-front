import React, { useState } from 'react';
import { Layers, Upload, Edit3, Trash2, Loader2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { parse as parseYaml } from 'yaml';
import { createTasksBatch, updateTasksBatch, deleteTasksBatch } from './api';
import BatchPromptModal from './BatchPromptModal';
import BatchPreview from './BatchPreview';
import BatchYamlTextarea from './BatchYamlTextarea';
import { Sheet, IconWell, InlineNotice, fieldClass, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

const EXAMPLE_CREATE = `- task_class: "10"
  topic_number: "1.1"
  content: |
    Решите уравнение:

    $$
    x^2 - 5x + 6 = 0
    $$
  answer: 2; 3
  is_open_answer: true
  difficulty: 2
  topic: Алгебра
  section: Квадратные уравнения

- task_class: "10"
  topic_number: "1.1"
  content: Сколько корней имеет уравнение $x^2 + 1 = 0$?
  options:
    - 0
    - 1
    - 2
    - бесконечно
  answer: 0
  is_open_answer: false
  difficulty: 1
  hint: Вспомните дискриминант

- task_class: "10"
  topic_number: "1.1"
  content: Найдите значение выражения $x^2 + 2x + 1$ при $x = 5$.
  answer: 36
  is_open_answer: true
  difficulty: 3
  topic: Алгебра
  section: Квадратные уравнения
  hint: |
    Подставьте значение $x$.

    Упростите:

    $$
    x^2 + 2x + 1 = (x + 1)^2
    $$
  solution: |
    При $x = 5$:

    $$
    (5 + 1)^2 = 36
    $$`;

const EXAMPLE_UPDATE = `- id: 1
  difficulty: 3
  topic: Алгебра
  section: Квадратные уравнения

- id: 2
  answer: 4
  hint: Подумайте о дискриминанте`;

const EXAMPLE_DELETE = `- 1
- 2
- 3
- 4
- 5`;

export default function BatchTab({ onSuccess }) {
  const [mode, setMode] = useState('create');
  const [yamlText, setYamlText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showExample, setShowExample] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewMode, setPreviewMode] = useState('create');

  const parseAndValidate = (text, currentMode) => {
    if (!text.trim()) throw new Error('Пустой ввод');
    const parsed = parseYaml(text);
    if (currentMode === 'delete') {
      if (!Array.isArray(parsed)) throw new Error('Должен быть список ID (каждый с новой строки: - 1, - 2)');
      if (parsed.length === 0) throw new Error('Список ID не может быть пустым');
      for (const id of parsed) {
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
          throw new Error(`Некорректный ID: ${id}. Должны быть целые положительные числа.`);
        }
      }
      return parsed;
    }
    if (!Array.isArray(parsed)) throw new Error('Должен быть список заданий (каждый блок начинается с "-")');
    if (parsed.length === 0) throw new Error('Список не может быть пустым');
    if (parsed.length > 500) throw new Error(`Максимум 500 заданий за раз, у вас ${parsed.length}`);
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`Элемент [${i}]: должен быть объектом с полями`);
      }
      if (currentMode === 'update') {
        if (!item.id || typeof item.id !== 'number' || !Number.isInteger(item.id)) {
          throw new Error(`Элемент [${i}]: отсутствует или некорректный id`);
        }
      } else {
        if (!item.task_class || !String(item.task_class).trim()) throw new Error(`Элемент [${i}]: отсутствует task_class`);
        if (!item.topic_number || !String(item.topic_number).trim()) throw new Error(`Элемент [${i}]: отсутствует topic_number`);
        if (!item.content || !String(item.content).trim()) throw new Error(`Элемент [${i}]: отсутствует content`);
        if (item.answer === undefined || item.answer === null || String(item.answer).trim() === '') throw new Error(`Элемент [${i}]: отсутствует answer`);
        if (item.is_open_answer === false && (!item.options || !Array.isArray(item.options) || item.options.length === 0)) throw new Error(`Элемент [${i}]: для закрытого задания нужно options`);
        if (item.difficulty !== undefined && item.difficulty !== null && (Number(item.difficulty) < 1 || Number(item.difficulty) > 5)) throw new Error(`Элемент [${i}]: difficulty должно быть 1-5`);
      }
    }
    return parsed.map(item => {
      if (currentMode === 'update') {
        const copy = { ...item };
        if (copy.difficulty !== undefined && copy.difficulty !== null) copy.difficulty = Number(copy.difficulty);
        return copy;
      }
      return {
        ...item,
        task_class: String(item.task_class),
        topic_number: String(item.topic_number),
        is_open_answer: item.is_open_answer !== false,
        difficulty: item.difficulty !== undefined && item.difficulty !== null ? Number(item.difficulty) : undefined,
        options: Array.isArray(item.options) ? item.options.map(o => String(o)) : item.options,
      };
    });
  };

  const updatePreview = (text, currentMode) => {
    if (!text.trim()) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }
    try {
      const parsed = parseAndValidate(text, currentMode);
      setPreviewData(parsed);
      setPreviewError(null);
    } catch (e) {
      setPreviewData(null);
      setPreviewError(e.message || 'Некорректный YAML');
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
    setPreviewMode(newMode);
    setPreviewData(null);
    setPreviewError(null);
  };

  const handleTextChange = (text) => {
    setYamlText(text);
    setError(null);
    setResult(null);
    updatePreview(text, mode);
    setPreviewMode(mode);
  };

  const getExample = () => {
    if (mode === 'create') return EXAMPLE_CREATE;
    if (mode === 'update') return EXAMPLE_UPDATE;
    return EXAMPLE_DELETE;
  };

  const handleLoadExample = () => {
    const example = getExample().trim();
    setYamlText(example);
    setError(null);
    setResult(null);
    updatePreview(example, mode);
    setPreviewMode(mode);
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    let parsed;
    try {
      parsed = parseAndValidate(yamlText, mode);
    } catch (e) {
      setError(e.message || 'Некорректный YAML');
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
  const ModeIcon = mode === 'create' ? Upload : mode === 'update' ? Edit3 : Trash2;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <Sheet className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconWell><Layers size={18} strokeWidth={2} /></IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Пакетные операции
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {modeLabel} до 500 заданий за раз
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setPromptModalOpen(true)}
              className={secondaryBtnClass}
              title="Показать справку по формату"
            >
              <MessageSquare size={14} /> Справка
            </button>
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {[
                { id: 'create', label: 'Создать', icon: Upload },
                { id: 'update', label: 'Обновить', icon: Edit3 },
                { id: 'delete', label: 'Удалить', icon: Trash2 },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    mode === m.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <m.icon size={14} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Sheet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Sheet className="p-6 space-y-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                YAML {mode === 'delete' ? '(список ID)' : '(список заданий)'}
              </span>
              {yamlText && (
                <span className="text-xs text-zinc-400 tabular-nums">
                  {yamlText.split('\n').length} строк
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExample(!showExample)}
                className={secondaryBtnClass + ' !py-1.5 text-xs'}
              >
                Пример
                {showExample ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <button
                type="button"
                onClick={handleLoadExample}
                className={secondaryBtnClass + ' !py-1.5 text-xs'}
              >
                Загрузить пример
              </button>
            </div>
          </div>

          {promptModalOpen && (
            <BatchPromptModal onClose={() => setPromptModalOpen(false)} />
          )}

          {showExample && (
            <div className="rounded-xl bg-zinc-900 p-5 font-mono text-xs text-zinc-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {getExample().trim()}
            </div>
          )}

          <BatchYamlTextarea
            value={yamlText}
            onChange={handleTextChange}
            placeholder={mode === 'delete'
              ? 'Введите ID заданий, каждый с новой строки:\n- 1\n- 2\n- 3'
              : 'Введите задания через YAML. Ctrl+V / перетащите картинку — вставится как ![имя](url) без кавычек'}
            className={`${fieldClass} h-[500px] font-mono text-xs resize-y`}
            rows={20}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !yamlText.trim()}
            className={`${primaryBtnClass} w-full ${mode === 'delete' ? 'hover:bg-red-700 dark:hover:bg-red-200' : ''}`}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Обработка...</>
            ) : (
              <><ModeIcon size={16} /> {modeLabel} задания</>
            )}
          </button>
        </Sheet>

        <Sheet className="p-6 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
          <BatchPreview
            mode={previewMode}
            parsed={previewData}
            error={previewError}
            hasText={!!yamlText.trim()}
          />
        </Sheet>
      </div>

      {error && (
        <Sheet className="p-5">
          <InlineNotice tone="error">{error}</InlineNotice>
        </Sheet>
      )}

      {result && (
        <Sheet className="p-5 space-y-1">
          <InlineNotice tone="success">Готово</InlineNotice>
          {result.type === 'create' && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Создано: <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{result.data.total}</span> заданий
            </p>
          )}
          {result.type === 'update' && (
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>Обновлено: <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{result.data.total_updated}</span></p>
              {result.data.not_found?.length > 0 && (
                <p>
                  Не найдено: <span className="font-semibold tabular-nums">{result.data.not_found.length}</span>
                  <span className="text-xs ml-2">({result.data.not_found.join(', ')})</span>
                </p>
              )}
            </div>
          )}
          {result.type === 'delete' && (
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>Удалено: <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{result.data.total_deleted}</span></p>
              {result.data.not_found?.length > 0 && (
                <p>
                  Не найдено: <span className="font-semibold tabular-nums">{result.data.not_found.length}</span>
                  <span className="text-xs ml-2">({result.data.not_found.join(', ')})</span>
                </p>
              )}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
