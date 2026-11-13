import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAsyncData } from '../../shared/hooks';
import { ChevronRight, Shield, GraduationCap, Sparkles, AlertTriangle, X, Clock, Loader2, Copy, FolderTree, Inbox } from 'lucide-react';
import { TaskMap } from './TaskMap';
import BankTaskCard from './BankTaskCard';
import { deleteTask, sendTaskToTelegram, updateTask, classifyTasks, fetchTasksByClassTopic, fetchTasksByTopicSection } from './api';
import { useAdminWorkspace } from './adminWorkspaceContext';
import { Sheet, IconWell, InlineNotice, NavTile, SearchField, EmptyState, primaryBtnClass, secondaryBtnClass, useConfirm } from '../../shared/ui';

const EXAM_KEYWORDS = ['ЦТ', 'ЦЭ', 'РЦЭ', 'ДРТ', 'РТ'];
const NO_TASKS = [];

const hasExamKeyword = (text) => {
  if (!text) return false;
  return EXAM_KEYWORDS.some((kw) => text.includes(kw));
};

const copyJSONToClipboard = async (tasks, setFeedback) => {
  const data = JSON.stringify(tasks.map(t => ({
    id: t.id,
    task_class: t.task_class,
    topic_number: t.topic_number,
    topic: t.topic || '',
    section: t.section || '',
    content: t.content,
    answer: t.answer,
    is_open_answer: t.is_open_answer,
    difficulty: t.difficulty,
    options: t.options,
    hint: t.hint || '',
    solution: t.solution || '',
  })), null, 2);
  try {
    await navigator.clipboard.writeText(data);
    if (setFeedback) setFeedback('JSON скопирован в буфер обмена');
    setTimeout(() => setFeedback?.(null), 2000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = data;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (setFeedback) setFeedback('JSON скопирован в буфер');
    setTimeout(() => setFeedback?.(null), 2000);
  }
};

export default function BankTab({ tasksMeta, availableClasses, bankClass, setBankClass, bankTopic, setBankTopic, onEditTask, onTasksUpdate }) {
  const confirm = useConfirm();
  const { showError, showSuccess } = useAdminWorkspace();
  const [feedback, setFeedback] = useState(null);
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [examFilter, setExamFilter] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  const [navMode, setNavMode] = useState('class');
  const [selectedNavTopic, setSelectedNavTopic] = useState(null);
  const [selectedNavSection, setSelectedNavSection] = useState(null);
  const [topicSectionMeta, setTopicSectionMeta] = useState(null);


  useEffect(() => {
    if (navMode !== 'topic') return;
    let cancelled = false;
    const load = async () => {
      try {
        const { fetchTasksMetaByTopicSection } = await import('./api');
        if (cancelled) return;
        const data = await fetchTasksMetaByTopicSection();
        if (!cancelled) setTopicSectionMeta(data);
      } catch (e) { console.error(e); }
    };
    load();
    return () => { cancelled = true; };
  }, [navMode]);

  // Задания текущего раздела: по классу и подразделу или по теме и разделу.
  const tasksKey = navMode === 'class'
    ? (bankClass && bankTopic ? `class:${bankClass}:${bankTopic}` : null)
    : (navMode === 'topic' && selectedNavTopic && selectedNavSection ? `topic:${selectedNavTopic}:${selectedNavSection}` : null);
  const tasksQuery = useAsyncData(tasksKey, async () => {
    try {
      return navMode === 'class'
        ? await fetchTasksByClassTopic(bankClass, bankTopic)
        : await fetchTasksByTopicSection(selectedNavTopic, selectedNavSection);
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const loadedTasks = tasksQuery.data || NO_TASKS;
  const loadingTasks = tasksQuery.loading;
  const reloadTasks = tasksQuery.reload;

  const refreshCurrentTasks = useCallback(async () => {
    await reloadTasks();
    if (onTasksUpdate) onTasksUpdate();
  }, [reloadTasks, onTasksUpdate]);

  const [classifyRunning, setClassifyRunning] = useState(false);
  const [classifyResult, setClassifyResult] = useState(null);
  const [classifyModal, setClassifyModal] = useState(false);
  // Задания, которые классификатор не смог разложить: их номера (#id) в строках журнала с ошибкой.
  const failedTaskIds = useMemo(() => {
    const ids = new Set();
    if (!classifyResult?.log) return ids;
    classifyResult.log.forEach(line => {
      const match = line.match(/#(\d+)/);
      if (match && (line.includes('❌') || line.includes('не совпал') || line.includes('пропущено') || line.includes('ошибок'))) {
        ids.add(parseInt(match[1]));
      }
    });
    const failedLines = classifyResult.log.filter(l => l.includes('❌') || l.includes('не совпал'));
    failedLines.forEach(line => {
      const idMatch = line.match(/#(\d+)/g);
      if (idMatch) idMatch.forEach(m => ids.add(parseInt(m.replace('#', ''))));
    });
    return ids;
  }, [classifyResult]);

  const handleDelete = async (taskId) => {
    if (!(await confirm(`Удалить задание #${taskId}?`, { danger: true, confirmLabel: 'Удалить' }))) return;
    try {
      await deleteTask(taskId);
      await refreshCurrentTasks();
      showSuccess('Задание удалено');
    } catch (error) { showError(error, 'Ошибка при удалении'); }
  };

  const handleSendTg = async (taskId) => {
    try {
      await sendTaskToTelegram(taskId);
      showSuccess('Задача отправлена в Telegram');
    } catch (err) {
      showError(err, 'Ошибка при отправке в Telegram');
    }
  };

  const handleTopicChange = async (taskId, task, newTopic) => {
    try {
      await updateTask(taskId, { ...task, topic: newTopic, section: '' });
      await refreshCurrentTasks();
    } catch (err) { showError(err, 'Ошибка при обновлении темы'); }
  };

  const handleSectionChange = async (taskId, task, newSection) => {
    try {
      await updateTask(taskId, { ...task, section: newSection });
      await refreshCurrentTasks();
    } catch (err) { showError(err, 'Ошибка при обновлении раздела'); }
  };

  const handleDifficultyChange = async (taskId, task, newDiff) => {
    try {
      await updateTask(taskId, { ...task, difficulty: parseInt(newDiff) });
      await refreshCurrentTasks();
    } catch (err) { showError(err, 'Ошибка при обновлении сложности'); }
  };

  const handleExportJSON = () => {
    copyJSONToClipboard(loadedTasks, setFeedback);
  };

  const [classifyAll, setClassifyAll] = useState(false);
  const [reestimateDifficulty, setReestimateDifficulty] = useState(false);
  const [skipClassification, setSkipClassification] = useState(false);

  const filteredClasses = useMemo(() => {
    return availableClasses.filter(cls =>
      cls.toLowerCase().includes(classSearch.toLowerCase())
    );
  }, [availableClasses, classSearch]);

  const topicsForClass = useMemo(() => {
    if (!bankClass || !tasksMeta || !tasksMeta[bankClass]) return [];
    return Object.keys(tasksMeta[bankClass]).sort();
  }, [bankClass, tasksMeta]);

  const filteredTopics = useMemo(() => {
    return topicsForClass.filter(topic =>
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    );
  }, [topicsForClass, topicSearch]);

  const filteredNavTopics = useMemo(() => {
    if (!topicSectionMeta) return [];
    return Object.keys(topicSectionMeta)
      .filter(t => t.toLowerCase().includes(topicSearch.toLowerCase()))
      .sort();
  }, [topicSectionMeta, topicSearch]);

  const sectionsForNavTopic = useMemo(() => {
    if (!selectedNavTopic || !topicSectionMeta?.[selectedNavTopic]) return [];
    return Object.keys(topicSectionMeta[selectedNavTopic]).sort();
  }, [selectedNavTopic, topicSectionMeta]);

  const currentTasks = useMemo(() => {
    let list = loadedTasks;
    if (examFilter) list = list.filter(t => hasExamKeyword(t.content));
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      list = list.filter(t =>
        t.content?.toLowerCase().includes(q) ||
        t.answer?.toLowerCase().includes(q) ||
        t.id?.toString().includes(q)
      );
    }
    return list.slice().sort((a, b) => {
      if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
      return (a.difficulty || 0) - (b.difficulty || 0);
    });
  }, [loadedTasks, examFilter, taskSearch]);

  const handleClassify = async () => {
    setClassifyRunning(true);
    setClassifyResult(null);
    try {
      const ids = currentTasks.map(t => t.id);
      const res = await classifyTasks({
        task_ids: ids,
        include_classified: classifyAll,
        reestimate_difficulty: reestimateDifficulty,
        skip_classification: reestimateDifficulty && skipClassification,
      });
      setClassifyResult(res);
      setClassifyModal(true);
      await refreshCurrentTasks();
    } catch (err) {
      showError(err, 'Ошибка при запуске классификатора');
    } finally {
      setClassifyRunning(false);
    }
  };

  const tasksCountByTopic = (cls, topic) => {
    return tasksMeta?.[cls]?.[topic] || 0;
  };

  const isShowingTasks = (navMode === 'class' && bankClass && bankTopic) ||
                          (navMode === 'topic' && selectedNavTopic && selectedNavSection);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <Sheet className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconWell><Shield size={18} strokeWidth={2} /></IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Банк заданий</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {navMode === 'class'
                  ? (bankClass ? `${bankClass}${bankTopic ? ` → ${bankTopic}` : ' → выберите подраздел'}` : `${availableClasses.length} разделов доступно`)
                  : (selectedNavTopic ? `${selectedNavTopic}${selectedNavSection ? ` → ${selectedNavSection}` : ' → выберите раздел'}` : `${filteredNavTopics.length} тем доступно`)
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => { setNavMode('class'); setBankClass(null); setBankTopic(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  navMode === 'class' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <GraduationCap size={12} /> Классы
              </button>
              <button
                type="button"
                onClick={() => { setNavMode('topic'); setSelectedNavTopic(null); setSelectedNavSection(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  navMode === 'topic' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <FolderTree size={12} /> Топики
              </button>
            </div>
            <button
              type="button"
              onClick={() => setExamFilter(!examFilter)}
              className={`${examFilter ? primaryBtnClass : secondaryBtnClass} !py-1.5 text-xs`}
            >
              {examFilter ? '✓ Экзамен' : 'ЦТ/ЦЭ/РТ'}
            </button>
            {loadedTasks.length > 0 && (
              <button type="button" onClick={handleExportJSON} className={`${secondaryBtnClass} !py-1.5 text-xs`} title="Копировать JSON в буфер обмена">
                <Copy size={12} /> JSON
              </button>
            )}
            {(bankTopic || selectedNavSection) ? (
              <button type="button" onClick={() => {
                if (navMode === 'class') { setBankTopic(null); setTaskSearch(''); setExamFilter(false); }
                else { setSelectedNavSection(null); setTaskSearch(''); setExamFilter(false); }
              }} className={`${secondaryBtnClass} !py-1.5 text-xs`}>
                <ChevronRight size={14} className="rotate-180" /> Назад
              </button>
            ) : (bankClass || selectedNavTopic) && (
              <button type="button" onClick={() => {
                if (navMode === 'class') { setBankClass(null); setClassSearch(''); }
                else { setSelectedNavTopic(null); setTopicSearch(''); }
              }} className={`${secondaryBtnClass} !py-1.5 text-xs`}>
                <ChevronRight size={14} className="rotate-180" /> Ко всем
              </button>
            )}
          </div>
        </div>
      </Sheet>

      {!tasksMeta && navMode === 'class' && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
        </div>
      )}

      {navMode === 'class' && (
        <>
          {!bankClass && (
            <div className="space-y-4">
              <SearchField value={classSearch} onChange={setClassSearch} placeholder="Поиск раздела..." />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map(cls => {
                  const topicsCount = Object.keys(tasksMeta[cls] || {}).length;
                  const totalTasks = Object.values(tasksMeta[cls] || {}).reduce((sum, count) => sum + count, 0);
                  return (
                    <NavTile
                      key={cls}
                      title={`${cls} раздел`}
                      meta={`${topicsCount} подразделов · ${totalTasks} заданий`}
                      onClick={() => { setBankClass(cls); setBankTopic(null); }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {bankClass && !bankTopic && (
            <div className="space-y-4">
              <SearchField value={topicSearch} onChange={setTopicSearch} placeholder="Поиск подраздела..." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTopics.map((topic, index) => {
                  const count = tasksCountByTopic(bankClass, topic);
                  return (
                    <NavTile
                      key={topic}
                      index={index + 1}
                      title={topic}
                      meta={`${count} заданий`}
                      onClick={() => setBankTopic(topic)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {navMode === 'topic' && (
        <>
          {!selectedNavTopic && (
            <div className="space-y-4">
              <SearchField value={topicSearch} onChange={setTopicSearch} placeholder="Поиск темы..." />
              {!topicSectionMeta && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-zinc-400" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNavTopics.map(topic => {
                  const sections = topicSectionMeta?.[topic] || {};
                  const sectionCount = Object.keys(sections).length;
                  const totalTasks = Object.values(sections).reduce((s, c) => s + c, 0);
                  return (
                    <NavTile
                      key={topic}
                      title={topic}
                      meta={`${sectionCount} разделов · ${totalTasks} заданий`}
                      onClick={() => { setSelectedNavTopic(topic); setSelectedNavSection(null); }}
                    />
                  );
                })}
              </div>
              {!loadingTasks && filteredNavTopics.length === 0 && topicSectionMeta && (
                <EmptyState framed={false} className="py-12" icon={<Inbox size={20} />} title="Нет тем" />
              )}
            </div>
          )}

          {selectedNavTopic && !selectedNavSection && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sectionsForNavTopic.map((section, index) => {
                  const count = topicSectionMeta?.[selectedNavTopic]?.[section] || 0;
                  return (
                    <NavTile
                      key={section}
                      index={index + 1}
                      title={section}
                      meta={`${count} заданий`}
                      onClick={() => setSelectedNavSection(section)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {isShowingTasks && (
        loadingTasks ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <SearchField className="flex-1 min-w-[200px]" value={taskSearch} onChange={setTaskSearch} placeholder="Поиск по тексту задания..." />
              {loadedTasks.length > 0 && (
                <button type="button" onClick={handleExportJSON} className={secondaryBtnClass}>
                  <Copy size={14} /> JSON
                </button>
              )}
              <button
                type="button"
                onClick={() => setExamFilter(!examFilter)}
                className={examFilter ? primaryBtnClass : secondaryBtnClass}
              >
                {examFilter ? '✓ Экзамен' : 'ЦТ/ЦЭ/РТ'}
              </button>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                {taskSearch ? `Найдено: ${currentTasks.length} из ${loadedTasks.length}` : `${currentTasks.length} заданий`}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {classifyResult && !classifyModal && (
                  <button
                    type="button"
                    onClick={() => setClassifyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <AlertTriangle size={12} />
                    {classifyResult.failed || 0} ошибок
                  </button>
                )}
                <div className="flex items-center gap-1 flex-wrap">
                  <label className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors select-none ${
                    classifyAll ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500'
                  }`}>
                    <input type="checkbox" checked={classifyAll} onChange={e => setClassifyAll(e.target.checked)}
                      className="w-3 h-3 accent-zinc-900 cursor-pointer" />
                    Все
                  </label>
                  <label className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors select-none ${
                    reestimateDifficulty ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500'
                  }`}>
                    <input type="checkbox" checked={reestimateDifficulty} onChange={e => setReestimateDifficulty(e.target.checked)}
                      className="w-3 h-3 accent-zinc-900 cursor-pointer" />
                    Сложность
                  </label>
                  {reestimateDifficulty && (
                    <label className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors select-none ${
                      skipClassification ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400'
                    }`}>
                      <input type="checkbox" checked={skipClassification} onChange={e => setSkipClassification(e.target.checked)}
                        className="w-3 h-3 accent-zinc-900 cursor-pointer" />
                      Только сложность
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={handleClassify}
                    disabled={classifyRunning || currentTasks.length === 0}
                    className={primaryBtnClass}
                  >
                    {classifyRunning ? (
                      <><Clock size={14} className="animate-spin" /> Идёт...</>
                    ) : (
                      <><Sparkles size={14} /> Классифицировать ({classifyAll ? 'все' : currentTasks.length})</>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {currentTasks.map((task, index) => (
                <BankTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  failed={failedTaskIds.has(task.id)}
                  hintOpen={!!openHints[task.id]}
                  solutionOpen={!!openSolutions[task.id]}
                  onToggleHint={() => setOpenHints((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                  onToggleSolution={() => setOpenSolutions((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                  onTopicChange={(value) => handleTopicChange(task.id, task, value)}
                  onSectionChange={(value) => handleSectionChange(task.id, task, value)}
                  onDifficultyChange={(value) => handleDifficultyChange(task.id, task, value)}
                  onSend={() => handleSendTg(task.id)}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </div>
            {!currentTasks.length && (
              <EmptyState framed={false} className="py-16" icon={<Inbox size={20} />} title="Нет заданий" />
            )}
          </div>
        )
      )}

      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 shadow-sm px-5 py-3 rounded-3xl text-sm font-medium animate-in slide-in-from-right-2 duration-300">
          <InlineNotice tone="success">{feedback}</InlineNotice>
        </div>
      )}

      {isShowingTasks && loadedTasks.length > 0 && (
        <TaskMap tasks={loadedTasks} onScroll={(taskId) => { const el = document.querySelector(`[data-task-id="${taskId}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
      )}

      {classifyModal && classifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setClassifyModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[#09090b] rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800/60 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <IconWell><Sparkles size={18} strokeWidth={2} /></IconWell>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Результаты классификации</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                    Обработано: {classifyResult.total_processed} заданий
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setClassifyModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              {[
                { label: 'Сложность', value: classifyResult.difficulty_assigned },
                { label: 'Решено', value: classifyResult.solved_correctly },
                { label: 'Классиф.', value: classifyResult.classified },
                { label: 'Ошибок', value: classifyResult.failed },
              ].map(stat => (
                <div key={stat.label} className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-center">
                  <div className="text-xs font-medium text-zinc-500">{stat.label}</div>
                  <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="rounded-xl bg-zinc-900 p-5 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
                {classifyResult.log.map((line, i) => {
                  let lineClass = 'text-zinc-300';
                  if (line.includes('❌') || line.includes('не совпал') || line.includes('ошибок')) lineClass = 'text-red-400';
                  else if (line.includes('✅') || line.includes('🎯') || line.includes('📊')) lineClass = 'text-zinc-100';
                  else if (line.includes('🔍') || line.includes('📚') || line.includes('──')) lineClass = 'text-zinc-400';
                  else if (line.includes('⚠️')) lineClass = 'text-zinc-200';

                  const idMatch = line.match(/#(\d+)/);
                  return (
                    <div key={i} className={lineClass}>
                      {idMatch ? (
                        <>
                          {line.substring(0, line.indexOf('#' + idMatch[1]))}
                          <button
                            type="button"
                            onClick={() => {
                              setClassifyModal(false);
                              const el = document.querySelector(`[data-task-id="${idMatch[1]}"]`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if (el) {
                                el.style.outline = '2px solid #18181b';
                                setTimeout(() => { el.style.outline = ''; }, 3000);
                              }
                            }}
                            className="text-zinc-100 underline hover:text-white font-semibold"
                          >
                            #{idMatch[1]}
                          </button>
                          {line.substring(line.indexOf('#' + idMatch[1]) + idMatch[1].length + 1)}
                        </>
                      ) : (
                        line
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0 gap-4">
              <p className="text-sm text-zinc-500">
                Проблемные задания подсвечены в банке
              </p>
              <button type="button" onClick={() => setClassifyModal(false)} className={primaryBtnClass}>
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
