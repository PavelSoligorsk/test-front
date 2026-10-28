import { useMemo, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, Search } from 'lucide-react';
import { useAsyncData } from '../../shared/hooks';
import { MarkdownRenderer } from '../../shared/ui';
import { MAIN_TOPICS } from '../../pages/AdminDashboardPage/constants';
import CustomTasksTab from './CustomTasksTab';
import {
  fetchTasksByClass,
  fetchTasksByTopic,
  fetchTasksMetaByClass,
  fetchTasksMetaByTopic,
  fetchTest,
  fetchTests,
  metaCount,
  sortKeys,
  taskOptions,
} from './taskBankApi';

const IDLE_QUERY = { loading: false, error: null };

const MODES = [
  { id: 'tests', label: 'Тесты' },
  { id: 'class', label: 'По классам' },
  { id: 'topic', label: 'По темам' },
  { id: 'custom', label: 'Свои' },
];

function errorText(err, fallback) {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}

function testTaskCount(test) {
  if (Array.isArray(test?.task_ids)) return test.task_ids.length;
  if (Array.isArray(test?.tasks)) return test.tasks.length;
  return Number.isFinite(test?.tasks_count) ? test.tasks_count : null;
}

function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function ListButton({ title, note, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white dark:hover:bg-zinc-900"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</span>
      {note != null && <span className="shrink-0 text-xs tabular-nums text-zinc-400">{note}</span>}
    </button>
  );
}

function TaskRow({ task, index, checked, onToggle, onCopy }) {
  const options = task.is_open_answer ? [] : taskOptions(task);
  return (
    <div className={`rounded-2xl border bg-white p-3 dark:bg-zinc-950 ${checked ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-800'}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`Выбрать задание ${index + 1}`}
          onClick={onToggle}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950' : 'border-zinc-300 dark:border-zinc-700'}`}
        >
          {checked && <Check size={13} strokeWidth={3} />}
        </button>
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">№{index + 1}</span>
        <span className="text-[11px] text-zinc-400">
          {task.is_open_answer ? 'Открытый ответ' : 'С вариантами'}
          {task.difficulty ? ` · ур. ${task.difficulty}` : ''}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="ml-auto rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          На доску
        </button>
      </div>
      <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
        <MarkdownRenderer className="prose-sm">{task.content || ''}</MarkdownRenderer>
      </div>
      {options.length > 0 && (
        <ol className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {options.map((option, optionIndex) => (
            <li key={optionIndex} className="flex gap-2">
              <span className="shrink-0 tabular-nums text-zinc-400">{optionIndex + 1}.</span>
              <MarkdownRenderer className="prose-sm">{option}</MarkdownRenderer>
            </li>
          ))}
        </ol>
      )}
      {task.answer != null && String(task.answer).trim() && (
        <p className="mt-2 text-xs text-zinc-500">
          Ответ: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{String(task.answer)}</span>
        </p>
      )}
    </div>
  );
}

export default function BoardTasksPane({ onCopy }) {
  const [mode, setMode] = useState('tests');
  const [test, setTest] = useState(null);
  const [taskClass, setTaskClass] = useState(null);
  const [topicNumber, setTopicNumber] = useState(null);
  const [topicKey, setTopicKey] = useState(null);
  const [section, setSection] = useState(null);
  const [selection, setSelection] = useState({ key: null, ids: new Set() });
  const [query, setQuery] = useState('');

  // Списки грузятся при первом заходе в режим и остаются на месте при переключении.
  const testsQuery = useAsyncData(mode === 'tests' ? 'tests' : null, async () => (await fetchTests()) || []);
  const classQuery = useAsyncData(mode === 'class' ? 'class' : null, async () => (await fetchTasksMetaByClass()) || {});
  const topicQuery = useAsyncData(mode === 'topic' ? 'topic' : null, async () => (await fetchTasksMetaByTopic()) || {});
  // «Свои» живут в CustomTasksTab — своего списка здесь у них нет.
  const listQuery = { tests: testsQuery, class: classQuery, topic: topicQuery }[mode] || IDLE_QUERY;
  const tests = testsQuery.data;
  const classMeta = classQuery.data;
  const topicMeta = topicQuery.data;

  const leafKey = mode === 'tests'
    ? (test ? `tests:${test.id}` : null)
    : mode === 'class'
      ? (taskClass != null && topicNumber != null ? `class:${taskClass}:${topicNumber}` : null)
      : mode === 'topic' && topicKey != null && section != null ? `topic:${topicKey}:${section}` : null;
  const leaf = leafKey != null;
  const tasksQuery = useAsyncData(leafKey, async () => {
    const list = mode === 'tests'
      ? (await fetchTest(test.id))?.tasks
      : mode === 'class'
        ? await fetchTasksByClass(taskClass, topicNumber)
        : await fetchTasksByTopic(topicKey, section);
    return Array.isArray(list) ? list : [];
  });
  const tasks = tasksQuery.data || null;

  const active = leaf ? tasksQuery : listQuery;
  const loading = active.loading;
  const error = active.error ? errorText(active.error, leaf ? 'Не удалось загрузить задания' : 'Не удалось загрузить список') : null;

  // В тесте сразу выбраны все задания, в банке — ни одного; выбор живёт, пока открыт тот же лист.
  const selected = selection.key === leafKey
    ? selection.ids
    : new Set(mode === 'tests' && tasks ? tasks.map((item) => item.id) : []);
  const updateSelected = (update) => setSelection({ key: leafKey, ids: update(selected) });

  const needle = query.trim().toLowerCase();
  const visibleTests = useMemo(() => {
    const list = Array.isArray(tests) ? tests : [];
    if (!needle) return list;
    return list.filter((item) => `${item.title || ''} ${item.target_class || ''} ${item.target_topic || ''}`.toLowerCase().includes(needle));
  }, [tests, needle]);
  const visibleTasks = useMemo(() => {
    const list = tasks || [];
    if (!needle) return list;
    return list.filter((item) => `${item.content || ''} ${item.id}`.toLowerCase().includes(needle));
  }, [tasks, needle]);

  const leafTitle = mode === 'tests'
    ? (test?.title || 'Тест')
    : mode === 'class' ? `${taskClass} · ${topicNumber}` : (section || '');
  const crumbs = mode === 'custom'
    ? 'Свои'
    : mode === 'tests'
    ? (test ? 'Тест' : 'Тесты')
    : mode === 'class'
      ? (taskClass == null ? 'Классы' : topicNumber == null ? `${taskClass} — выберите подраздел` : 'Задания')
      : (topicKey == null ? 'Темы' : section == null ? (MAIN_TOPICS[topicKey] || topicKey) : 'Задания');
  const deep = Boolean(test || taskClass != null || topicKey != null);

  const resetLeaf = () => {
    setQuery('');
  };

  const back = () => {
    resetLeaf();
    if (mode === 'tests') setTest(null);
    else if (mode === 'class') {
      if (topicNumber != null) setTopicNumber(null);
      else setTaskClass(null);
    } else if (section != null) setSection(null);
    else setTopicKey(null);
  };

  const switchMode = (next) => {
    resetLeaf();
    setMode(next);
    setTest(null);
    setTaskClass(null);
    setTopicNumber(null);
    setTopicKey(null);
    setSection(null);
  };

  const toggle = (id) => {
    updateSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copy = (list) => {
    if (!list.length) return;
    const order = tasks || [];
    onCopy?.(
      list.map((item) => ({ task: item, number: order.indexOf(item) + 1 })),
      { title: mode === 'tests' ? test?.title || '' : '' },
    );
  };

  const picked = (tasks || []).filter((item) => selected.has(item.id));
  const allVisibleOn = visibleTasks.length > 0 && visibleTasks.every((item) => selected.has(item.id));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fafafa] dark:bg-[#09090b]">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {deep ? (
          <button type="button" onClick={back} aria-label="Назад" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center text-zinc-400"><ClipboardList size={16} /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{leaf ? leafTitle : 'Задания'}</p>
          <p className="truncate text-xs text-zinc-500">{crumbs}</p>
        </div>
        {!deep && (
          <div className="flex rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-900">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchMode(item.id)}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${mode === item.id ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-500'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(leaf || (mode === 'tests' && !test)) && mode !== 'custom' && (
        <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={leaf ? 'Поиск по условию' : 'Поиск теста'}
              className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          {leaf && tasks && tasks.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateSelected((prev) => {
                  const next = new Set(prev);
                  visibleTasks.forEach((item) => (allVisibleOn ? next.delete(item.id) : next.add(item.id)));
                  return next;
                })}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {allVisibleOn ? 'Снять все' : 'Выбрать все'}
              </button>
              <span className="text-[11px] tabular-nums text-zinc-400">
                {picked.length} из {tasks.length}
              </span>
              <button
                type="button"
                disabled={!picked.length}
                onClick={() => copy(picked)}
                className="ml-auto rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
              >
                На доску{picked.length ? ` (${picked.length})` : ''}
              </button>
            </div>
          )}
        </div>
      )}

      <CustomTasksTab hidden={mode !== 'custom'} onPlace={onCopy} />
      {mode !== 'custom' && (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading && <p className="px-2 py-8 text-center text-sm text-zinc-400">Загрузка…</p>}
        {error && !loading && <p className="px-2 py-8 text-center text-sm text-zinc-500">{error}</p>}

        {!loading && !error && mode === 'tests' && !test && (
          visibleTests.length ? (
            <div className="space-y-0.5">
              {visibleTests.map((item) => {
                const count = testTaskCount(item);
                const tags = [item.target_class ? `${item.target_class} кл.` : '', item.target_topic || ''].filter(Boolean).join(' · ');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { resetLeaf(); setTest(item); }}
                    className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-white dark:hover:bg-zinc-900"
                  >
                    <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{item.title || `Тест ${item.id}`}</span>
                    <span className="block truncate text-xs text-zinc-400">
                      {[tags, count != null ? `${count} ${plural(count, 'задание', 'задания', 'заданий')}` : ''].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : <p className="px-2 py-8 text-center text-sm text-zinc-500">{needle ? 'Ничего не найдено' : 'Тестов пока нет'}</p>
        )}

        {!loading && !error && mode === 'class' && classMeta && taskClass == null && (
          <div className="space-y-0.5">
            {sortKeys(Object.keys(classMeta)).map((cls) => (
              <ListButton key={cls} title={`${cls} класс`} note={metaCount(classMeta[cls])} onClick={() => setTaskClass(cls)} />
            ))}
          </div>
        )}
        {!loading && !error && mode === 'class' && classMeta && taskClass != null && topicNumber == null && (
          <div className="space-y-0.5">
            {sortKeys(Object.keys(classMeta[taskClass] || {})).map((topic) => (
              <ListButton key={topic} title={topic} note={metaCount(classMeta[taskClass][topic])} onClick={() => setTopicNumber(topic)} />
            ))}
          </div>
        )}

        {!loading && !error && mode === 'topic' && topicMeta && topicKey == null && (
          <div className="space-y-0.5">
            {Object.keys(topicMeta).map((key) => (
              <ListButton key={key} title={MAIN_TOPICS[key] || key} note={metaCount(topicMeta[key])} onClick={() => setTopicKey(key)} />
            ))}
          </div>
        )}
        {!loading && !error && mode === 'topic' && topicMeta && topicKey != null && section == null && (
          <div className="space-y-0.5">
            {Object.keys(topicMeta[topicKey] || {}).map((name) => (
              <ListButton key={name} title={name} note={metaCount(topicMeta[topicKey][name])} onClick={() => setSection(name)} />
            ))}
          </div>
        )}

        {!loading && !error && leaf && tasks && (
          visibleTasks.length ? (
            <div className="space-y-2">
              {visibleTasks.map((item) => (
                <TaskRow
                  key={item.id}
                  task={item}
                  index={tasks.indexOf(item)}
                  checked={selected.has(item.id)}
                  onToggle={() => toggle(item.id)}
                  onCopy={() => copy([item])}
                />
              ))}
            </div>
          ) : <p className="px-2 py-8 text-center text-sm text-zinc-500">{needle ? 'Ничего не найдено' : 'Заданий нет'}</p>
        )}
      </div>
      )}
    </div>
  );
}
