import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronRight, Edit3, Trash2, PlusCircle, CheckCircle2, Send, Database, GraduationCap, Shield, Sparkles, AlertTriangle, X, Zap, Clock, Loader2 } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { TaskMap } from './TaskMap';
import { deleteTask, sendTaskToTelegram, updateTask, classifyTasks, fetchTasksByClassTopic } from './api';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';

const EXAM_KEYWORDS = ['ЦТ', 'ЦЭ', 'РЦЭ', 'ДРТ', 'РТ'];

const hasExamKeyword = (text) => {
  if (!text) return false;
  return EXAM_KEYWORDS.some((kw) => text.includes(kw));
};

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return 'text-red-500 bg-red-50 border-red-100';
  if (lvl >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
  return 'text-emerald-500 bg-emerald-50 border-emerald-100';
};

export default function BankTab({ tasksMeta, availableClasses, bankClass, setBankClass, bankTopic, setBankTopic, onEditTask, onTasksUpdate }) {
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [examFilter, setExamFilter] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  // Lazy loading state
  const [loadedTasks, setLoadedTasks] = useState([]); // tasks for current class+topic
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Classify state
  const [classifyRunning, setClassifyRunning] = useState(false);
  const [classifyResult, setClassifyResult] = useState(null);
  const [classifyModal, setClassifyModal] = useState(false);
  const [failedTaskIds, setFailedTaskIds] = useState(new Set());

  // Load tasks when class + topic are selected
  useEffect(() => {
    if (!bankClass || !bankTopic) {
      setLoadedTasks([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingTasks(true);
      try {
        const data = await fetchTasksByClassTopic(bankClass, bankTopic);
        if (!cancelled) setLoadedTasks(data);
      } catch (e) {
        console.error('Failed to load tasks', e);
        if (!cancelled) setLoadedTasks([]);
      } finally {
        if (!cancelled) setLoadingTasks(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bankClass, bankTopic]);

  // Refresh tasks after update/delete/classify
  const refreshCurrentTasks = useCallback(async () => {
    if (!bankClass || !bankTopic) return;
    try {
      const data = await fetchTasksByClassTopic(bankClass, bankTopic);
      setLoadedTasks(data);
    } catch (e) { console.error(e); }
    if (onTasksUpdate) onTasksUpdate();
  }, [bankClass, bankTopic, onTasksUpdate]);

  // Derive failed IDs from classify log
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
    } catch (error) { alert('Ошибка при удалении'); }
  };

  const handleSendTg = async (taskId) => {
    try {
      await sendTaskToTelegram(taskId);
      alert('Задача успешно улетела в Telegram! 🚀');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Ошибка при отправке в Telegram';
      alert(`Косяк: ${errorMsg}`);
    }
  };

  const handleTopicChange = async (taskId, task, newTopic) => {
    try {
      await updateTask(taskId, { ...task, topic: newTopic, section: '' });
      await refreshCurrentTasks();
    } catch (err) { alert('Ошибка при обновлении темы'); }
  };

  const handleSectionChange = async (taskId, task, newSection) => {
    try {
      await updateTask(taskId, { ...task, section: newSection });
      await refreshCurrentTasks();
    } catch (err) { alert('Ошибка при обновлении раздела'); }
  };

  const handleDifficultyChange = async (taskId, task, newDiff) => {
    try {
      await updateTask(taskId, { ...task, difficulty: parseInt(newDiff) });
      await refreshCurrentTasks();
    } catch (err) { alert('Ошибка при обновлении сложности'); }
  };

  // Filter classes by search
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
      const res = await classifyTasks({ task_ids: ids });
      setClassifyResult(res);
      setClassifyModal(true);
      await refreshCurrentTasks();
    } catch (err) {
      alert('Ошибка при запуске классификатора: ' + (err.response?.data?.detail || err.message));
    } finally {
      setClassifyRunning(false);
    }
  };

  const tasksCountByTopic = (cls, topic) => {
    return tasksMeta?.[cls]?.[topic] || 0;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Банк заданий</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {bankClass
                  ? `${bankClass} раздел${bankTopic ? ` → ${bankTopic}` : ' → выберите подраздел'}`
                  : `${availableClasses.length} разделов доступно`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExamFilter(!examFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                examFilter
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-amber-300"
              }`}
            >
              {examFilter ? "✓ Экзамен" : "ЦТ/ЦЭ/РТ"}
            </button>
            {(bankClass || bankTopic) && (
              <button onClick={() => {
                if (bankTopic) { setBankTopic(null); setTaskSearch(''); setExamFilter(false); }
                else { setBankClass(null); setClassSearch(''); }
              }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all">
                <ChevronRight size={14} className="rotate-180" />
                {bankTopic ? 'К подразделам' : 'Ко всем разделам'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!tasksMeta && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      )}

      {/* Level 1: Class selection */}
      {tasksMeta && !bankClass && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Поиск раздела..." value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 placeholder:text-slate-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map(cls => {
              const topicsCount = Object.keys(tasksMeta[cls] || {}).length;
              const totalTasks = Object.values(tasksMeta[cls] || {}).reduce((sum, count) => sum + count, 0);
              return (
                <button key={cls} onClick={() => { setBankClass(cls); setBankTopic(null); }}
                  className="w-full bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all p-5 text-left">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-sm uppercase truncate">{cls} раздел</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-400">{topicsCount} подразделов</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-slate-400">{totalTasks} заданий</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Level 2: Topic selection */}
      {tasksMeta && bankClass && !bankTopic && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Поиск подраздела..." value={topicSearch}
              onChange={e => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 placeholder:text-slate-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTopics.map((topic, index) => {
              const count = tasksCountByTopic(bankClass, topic);
              return (
                <button key={topic} onClick={() => setBankTopic(topic)}
                  className="group p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-black text-sm shrink-0">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 text-sm leading-tight truncate">{topic}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{count} заданий</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Level 3: Task list */}
      {bankClass && bankTopic && (
        loadingTasks ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Поиск по тексту задания..." value={taskSearch}
                  onChange={e => setTaskSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 placeholder:text-slate-400" />
              </div>
              <button
                onClick={() => setExamFilter(!examFilter)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                  examFilter
                    ? "bg-amber-500 text-white shadow-lg"
                    : "bg-white border border-slate-200 text-slate-500 hover:border-amber-300"
                }`}
              >
                {examFilter ? "✓ Экзамен" : "ЦТ/ЦЭ/РТ"}
              </button>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                {taskSearch ? `Найдено: ${currentTasks.length} из ${loadedTasks.length}` : `${currentTasks.length} заданий`}
              </span>
              <div className="flex items-center gap-2">
                {classifyResult && !classifyModal && (
                  <button
                    onClick={() => setClassifyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-black text-amber-700 hover:bg-amber-100 transition-all"
                  >
                    <AlertTriangle size={12} />
                    {classifyResult.failed || 0} ошибок
                  </button>
                )}
                <button
                  onClick={handleClassify}
                  disabled={classifyRunning || currentTasks.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                    classifyRunning
                      ? 'bg-slate-200 text-slate-400 cursor-wait'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200'
                  }`}
                >
                  {classifyRunning ? (
                    <><Clock size={14} className="animate-spin" /> Идёт...</>
                  ) : (
                    <><Sparkles size={14} /> Классифицировать ({currentTasks.length})</>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {currentTasks.map((t, index) => {
                const isSolOpen = openSolutions[t.id];
                const isHintOpen = openHints[t.id];
                return (
                  <div key={t.id} data-task-id={t.id}
                    className={`bg-white rounded-[2rem] border shadow-sm hover:border-slate-300 transition-all ${
                      failedTaskIds.has(t.id)
                        ? 'border-red-300 ring-2 ring-red-100 bg-red-50/30'
                        : (!t.topic || !t.section)
                          ? 'border-amber-200 bg-amber-50/20'
                          : 'border-slate-200'
                    }`}>
                    <div className="p-6 space-y-6">
                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                          Задание №{index + 1}
                        </h4>
                        <div className="flex items-center gap-1.5 ml-auto">
                          {failedTaskIds.has(t.id) && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-lg" title="Ошибка классификации">
                              <AlertTriangle size={10} /> Ошибка
                            </span>
                          )}
                          {(!t.topic || !t.section) && !failedTaskIds.has(t.id) && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg" title="Не классифицировано">
                              <Zap size={10} /> Без темы
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">ID: {t.id}</span>
                          <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-black ${getDifficultyColor(t.difficulty)}`}>LVL {t.difficulty || "?"}</div>
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{t.is_open_answer ? "Открытый" : "Тест"}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <MarkdownPreview text={t.content} title="Условие задания" type="default" />
                      {!t.is_open_answer && t.options && (
                        <MarkdownPreview type="default"
                          text={(Array.isArray(t.options) ? t.options : t.options.split(';')).map(opt => opt.trim()).filter(opt => opt !== "").map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')} />
                      )}

                      {/* Answer, Hint, Solution */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-black text-slate-500">Ответ:</span>
                        <span className="text-sm font-black text-emerald-600">{t.answer}</span>
                        {t.hint && <button onClick={() => setOpenHints(prev => ({ ...prev, [t.id]: !prev[t.id] }))} className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black hover:bg-slate-200 transition-all">Подсказка</button>}
                        {t.solution && <button onClick={() => setOpenSolutions(prev => ({ ...prev, [t.id]: !prev[t.id] }))} className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black hover:bg-slate-200 transition-all">Решение</button>}
                      </div>

                      {openHints[t.id] && <div className="p-5 rounded-[2rem] bg-amber-50/50 border border-amber-200/40"><MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" /></div>}
                      {openSolutions[t.id] && <div className="p-5 rounded-[2rem] bg-blue-50/50 border border-blue-200/40"><MarkdownPreview text={t.solution} title="ПОЛНОЕ РЕШЕНИЕ" type="solution" /></div>}

                      {/* Admin controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <select value={t.topic || ''} onChange={e => handleTopicChange(t.id, t, e.target.value)}
                          className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors outline-none">
                          <option value="">Без темы</option>
                          {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                        </select>
                        <select value={t.section || ''} onChange={e => handleSectionChange(t.id, t, e.target.value)} disabled={!t.topic}
                          className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[180px] cursor-pointer hover:bg-slate-200 transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                          <option value="">Без раздела</option>
                          {t.topic && SECTIONS_BY_TOPIC[t.topic]?.map(section => (<option key={section} value={section}>{section}</option>))}
                        </select>
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-xl border ${getDifficultyColor(t.difficulty)}`}>
                          <span className="text-[9px] font-black uppercase tracking-tight">LVL</span>
                          <select value={t.difficulty || 1} onChange={e => handleDifficultyChange(t.id, t, e.target.value)}
                            className="text-sm font-black italic leading-none bg-transparent border-none outline-none cursor-pointer">
                            {[1, 2, 3, 4, 5].map(n => (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                          <button onClick={() => handleSendTg(t.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-[10px] font-bold uppercase rounded-xl transition-all shadow-sm">
                            <Send size={12} /> ТГ
                          </button>
                          <button onClick={() => onEditTask(t)}
                            className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 active:scale-90 hover:shadow-md transition-all">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(t.id)}
                            className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 active:scale-90 hover:shadow-md transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {!currentTasks.length && (
              <div className="text-center py-16 space-y-3">
                <p className="font-black text-slate-400 uppercase">Нет заданий</p>
              </div>
            )}
          </div>
        )
      )}

      {bankTopic && loadedTasks.length > 0 && (
        <TaskMap tasks={loadedTasks} onScroll={(taskId) => { const el = document.querySelector(`[data-task-id="${taskId}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
      )}

      {/* Classify Results Modal */}
      {classifyModal && classifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setClassifyModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic">Результаты классификации</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Обработано: {classifyResult.total_processed} заданий
                  </p>
                </div>
              </div>
              <button onClick={() => setClassifyModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Stats bar */}
            <div className="px-6 py-4 grid grid-cols-4 gap-3 shrink-0">
              {[
                { label: 'Сложность', value: classifyResult.difficulty_assigned, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: 'Решено', value: classifyResult.solved_correctly, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Классиф.', value: classifyResult.classified, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { label: 'Ошибок', value: classifyResult.failed, color: classifyResult.failed > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200' },
              ].map(stat => (
                <div key={stat.label} className={`px-3 py-2 rounded-xl border text-center ${stat.color}`}>
                  <div className="text-[9px] font-black uppercase opacity-60">{stat.label}</div>
                  <div className="text-2xl font-black italic">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Log */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="rounded-2xl bg-slate-900 p-5 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
                {classifyResult.log.map((line, i) => {
                  let lineClass = 'text-slate-300';
                  if (line.includes('❌') || line.includes('не совпал') || line.includes('ошибок')) lineClass = 'text-red-400';
                  else if (line.includes('✅') || line.includes('🎯') || line.includes('📊')) lineClass = 'text-emerald-400';
                  else if (line.includes('🔍') || line.includes('📚') || line.includes('──')) lineClass = 'text-blue-400';
                  else if (line.includes('⚠️')) lineClass = 'text-amber-400';

                  const idMatch = line.match(/#(\d+)/);
                  return (
                    <div key={i} className={lineClass}>
                      {idMatch ? (
                        <>
                          {line.substring(0, line.indexOf('#' + idMatch[1]))}
                          <button
                            onClick={() => {
                              setClassifyModal(false);
                              const el = document.querySelector(`[data-task-id="${idMatch[1]}"]`);
                              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              if (el) {
                                el.style.outline = '3px solid #ef4444';
                                setTimeout(() => { el.style.outline = ''; }, 3000);
                              }
                            }}
                            className="text-amber-300 underline hover:text-amber-100 font-bold"
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

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between shrink-0">
              <p className="text-[10px] font-bold text-slate-400">
                Проблемные задания подсвечены в банке
                <span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-300 ml-2 align-middle" />
              </p>
              <button onClick={() => setClassifyModal(false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-all">
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}