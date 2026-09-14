import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronRight, Edit3, Trash2, Send, Shield, GraduationCap, Sparkles, AlertTriangle, X, Zap, Clock, Loader2, Copy, FolderTree, Inbox } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { TaskMap } from './TaskMap';
import { deleteTask, sendTaskToTelegram, updateTask, classifyTasks, fetchTasksByClassTopic, fetchTasksByTopicSection } from './api';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';
import { useAdminWorkspace } from './AdminWorkspace';
import { Sheet, IconWell, InlineNotice, fieldClass, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

const EXAM_KEYWORDS = ['ЦТ', 'ЦЭ', 'РЦЭ', 'ДРТ', 'РТ'];

const hasExamKeyword = (text) => {
  if (!text) return false;
  return EXAM_KEYWORDS.some((kw) => text.includes(kw));
};

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40';
  if (lvl >= 3) return 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
  return 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800';
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

  const [loadedTasks, setLoadedTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

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

  useEffect(() => {
    if (navMode !== 'class' || !bankClass || !bankTopic) {
      if (navMode === 'class') setLoadedTasks([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingTasks(true);
      try {
        const data = await fetchTasksByClassTopic(bankClass, bankTopic);
        if (!cancelled) setLoadedTasks(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadedTasks([]);
      } finally {
        if (!cancelled) setLoadingTasks(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [navMode, bankClass, bankTopic]);

  useEffect(() => {
    if (navMode !== 'topic' || !selectedNavTopic || !selectedNavSection) {
      if (navMode === 'topic') setLoadedTasks([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingTasks(true);
      try {
        const data = await fetchTasksByTopicSection(selectedNavTopic, selectedNavSection);
        if (!cancelled) setLoadedTasks(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadedTasks([]);
      } finally {
        if (!cancelled) setLoadingTasks(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [navMode, selectedNavTopic, selectedNavSection]);

  const refreshCurrentTasks = useCallback(async () => {
    let data = [];
    try {
      if (navMode === 'class' && bankClass && bankTopic) {
        data = await fetchTasksByClassTopic(bankClass, bankTopic);
      } else if (navMode === 'topic' && selectedNavTopic && selectedNavSection) {
        data = await fetchTasksByTopicSection(selectedNavTopic, selectedNavSection);
      }
    } catch (e) { console.error(e); }
    if (data.length || loadedTasks.length) setLoadedTasks(data);
    if (onTasksUpdate) onTasksUpdate();
  }, [navMode, bankClass, bankTopic, selectedNavTopic, selectedNavSection, onTasksUpdate, loadedTasks.length]);

  const [classifyRunning, setClassifyRunning] = useState(false);
  const [classifyResult, setClassifyResult] = useState(null);
  const [classifyModal, setClassifyModal] = useState(false);
  const [failedTaskIds, setFailedTaskIds] = useState(new Set());

  useEffect(() => {
    if (!classifyResult?.log) return;
    const ids = new Set();
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
    setFailedTaskIds(ids);
  }, [classifyResult]);

  const handleDelete = async (taskId) => {
    if (!window.confirm(`Удалить задание #${taskId}?`)) return;
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

  const navTileClass = 'w-full bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors p-5 text-left';

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
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Поиск раздела..." value={classSearch}
                  onChange={e => setClassSearch(e.target.value)}
                  className={`${fieldClass} pl-10`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map(cls => {
                  const topicsCount = Object.keys(tasksMeta[cls] || {}).length;
                  const totalTasks = Object.values(tasksMeta[cls] || {}).reduce((sum, count) => sum + count, 0);
                  return (
                    <button key={cls} type="button" onClick={() => { setBankClass(cls); setBankTopic(null); }}
                      className={navTileClass}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{cls} раздел</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-500">{topicsCount} подразделов</span>
                            <span className="text-xs text-zinc-300">•</span>
                            <span className="text-xs text-zinc-500 tabular-nums">{totalTasks} заданий</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-300 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {bankClass && !bankTopic && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Поиск подраздела..." value={topicSearch}
                  onChange={e => setTopicSearch(e.target.value)}
                  className={`${fieldClass} pl-10`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTopics.map((topic, index) => {
                  const count = tasksCountByTopic(bankClass, topic);
                  return (
                    <button key={topic} type="button" onClick={() => setBankTopic(topic)}
                      className={`${navTileClass} p-4`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-sm shrink-0 tabular-nums">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 leading-tight truncate">{topic}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">{count} заданий</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                      </div>
                    </button>
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
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Поиск темы..." value={topicSearch}
                  onChange={e => setTopicSearch(e.target.value)}
                  className={`${fieldClass} pl-10`} />
              </div>
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
                    <button key={topic} type="button" onClick={() => { setSelectedNavTopic(topic); setSelectedNavSection(null); }}
                      className={navTileClass}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{topic}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-500">{sectionCount} разделов</span>
                            <span className="text-xs text-zinc-300">•</span>
                            <span className="text-xs text-zinc-500 tabular-nums">{totalTasks} заданий</span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-300 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
              {!loadingTasks && filteredNavTopics.length === 0 && topicSectionMeta && (
                <div className="flex flex-col items-center gap-3 py-12 text-zinc-400">
                  <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <Inbox size={20} />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">Нет тем</p>
                </div>
              )}
            </div>
          )}

          {selectedNavTopic && !selectedNavSection && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sectionsForNavTopic.map((section, index) => {
                  const count = topicSectionMeta?.[selectedNavTopic]?.[section] || 0;
                  return (
                    <button key={section} type="button" onClick={() => setSelectedNavSection(section)}
                      className={`${navTileClass} p-4`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-sm shrink-0 tabular-nums">{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 leading-tight truncate">{section}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">{count} заданий</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                      </div>
                    </button>
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
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Поиск по тексту задания..." value={taskSearch}
                  onChange={e => setTaskSearch(e.target.value)}
                  className={`${fieldClass} pl-10`} />
              </div>
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
              {currentTasks.map((t, index) => (
                <div
                  key={t.id}
                  data-task-id={t.id}
                  className={`bg-white dark:bg-[#09090b] rounded-3xl border shadow-sm overflow-hidden transition-colors ${
                    failedTaskIds.has(t.id)
                      ? 'border-red-300 dark:border-red-900/50 ring-1 ring-red-100 dark:ring-red-900/30'
                      : (!t.topic || !t.section)
                        ? 'border-zinc-300 dark:border-zinc-700'
                        : 'border-zinc-200 dark:border-zinc-800/60'
                  }`}
                >
                  <div className="p-6 space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        Задание №{index + 1}
                      </h4>
                      <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                        {failedTaskIds.has(t.id) && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-lg" title="Ошибка классификации">
                            <AlertTriangle size={10} /> Ошибка
                          </span>
                        )}
                        {(!t.topic || !t.section) && !failedTaskIds.has(t.id) && (
                          <span className="flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg" title="Не классифицировано">
                            <Zap size={10} /> Без темы
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg tabular-nums">ID: {t.id}</span>
                        <div className={`px-2 py-0.5 rounded-lg border text-xs font-semibold tabular-nums ${getDifficultyColor(t.difficulty)}`}>LVL {t.difficulty || '?'}</div>
                        <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-lg">{t.is_open_answer ? 'Открытый' : 'Тест'}</span>
                      </div>
                    </div>

                    <MarkdownPreview text={t.content} title="Условие задания" type="default" />
                    {!t.is_open_answer && t.options && (
                      <MarkdownPreview type="default"
                        text={(Array.isArray(t.options) ? t.options : t.options.split(';')).map(opt => opt.trim()).filter(opt => opt !== '').map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')} />
                    )}

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm font-medium text-zinc-500">Ответ:</span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{t.answer}</span>
                      {t.hint && <button type="button" onClick={() => setOpenHints(prev => ({ ...prev, [t.id]: !prev[t.id] }))} className={secondaryBtnClass + ' !py-1.5 text-xs'}>Подсказка</button>}
                      {t.solution && <button type="button" onClick={() => setOpenSolutions(prev => ({ ...prev, [t.id]: !prev[t.id] }))} className={secondaryBtnClass + ' !py-1.5 text-xs'}>Решение</button>}
                    </div>

                    {openHints[t.id] && <MarkdownPreview text={t.hint} title="Подсказка" type="hint" />}
                    {openSolutions[t.id] && <MarkdownPreview text={t.solution} title="Полное решение" type="solution" />}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <select value={t.topic || ''} onChange={e => handleTopicChange(t.id, t, e.target.value)}
                        className="text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer outline-none">
                        <option value="">Без темы</option>
                        {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                      </select>
                      <select value={t.section || ''} onChange={e => handleSectionChange(t.id, t, e.target.value)} disabled={!t.topic}
                        className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 truncate max-w-[180px] cursor-pointer outline-none disabled:opacity-50">
                        <option value="">Без раздела</option>
                        {t.topic && SECTIONS_BY_TOPIC[t.topic]?.map(section => (<option key={section} value={section}>{section}</option>))}
                      </select>
                      <div className={`flex items-center gap-2 px-2 py-1 rounded-xl border ${getDifficultyColor(t.difficulty)}`}>
                        <span className="text-xs font-medium">LVL</span>
                        <select value={t.difficulty || 1} onChange={e => handleDifficultyChange(t.id, t, e.target.value)}
                          className="text-sm font-semibold leading-none bg-transparent border-none outline-none cursor-pointer tabular-nums">
                          {[1, 2, 3, 4, 5].map(n => (<option key={n} value={n}>{n}</option>))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <button type="button" onClick={() => handleSendTg(t.id)} className={`${primaryBtnClass} !py-1.5 !px-3 text-xs`}>
                          <Send size={12} /> ТГ
                        </button>
                        <button type="button" onClick={() => onEditTask(t)}
                          className="p-2 bg-white dark:bg-zinc-950 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(t.id)}
                          className="p-2 bg-white dark:bg-zinc-950 text-zinc-400 hover:text-red-600 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!currentTasks.length && (
              <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
                <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                  <Inbox size={20} />
                </div>
                <p className="text-sm font-medium text-zinc-500">Нет заданий</p>
              </div>
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
