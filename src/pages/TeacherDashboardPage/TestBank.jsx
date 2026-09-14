import axios from 'axios';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, GraduationCap } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { MarkdownRenderer } from '../../shared/ui';

const EXAM_KEYWORDS = ['ЦТ', 'ЦЭ', 'РЦЭ', 'ДРТ', 'РТ'];

const hasExamKeyword = (text) => {
  if (!text) return false;
  return EXAM_KEYWORDS.some((kw) => text.includes(kw));
};

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800";
  if (lvl >= 3) return "text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800";
  return "text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800";
};

export default function TestBank({ onTaskToggle, selectedTasks, openSolutions, openHints, onToggleSolution, onToggleHint }) {
  const [meta, setMeta] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [examFilter, setExamFilter] = useState(false);
  const [examCache, setExamCache] = useState({});  // { "class::topic": true/false }
  const [loadingExamCache, setLoadingExamCache] = useState(false);

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      return session?.token || session?.access_token;
    } catch { return null; }
  };

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

  useEffect(() => {
    axios.get(`${API_BASE}/teacher/tasks-meta`, authHeaders())
      .then(res => setMeta(res.data))
      .catch(console.error);
  }, []);

  // При включении фильтра загружаем задания для всех class/topic, чтобы знать где есть ЦТ/ЦЭ/РТ
  useEffect(() => {
    if (!examFilter || !meta) return;
    let cancelled = false;
    const fetchExamData = async () => {
      setLoadingExamCache(true);
      const cache = {};
      const entries = [];
      for (const cls of Object.keys(meta)) {
        const classMeta = meta[cls];
        for (const topic of Object.keys(classMeta)) {
          entries.push({ cls, topic });
        }
      }
      // Загружаем пачками по 5
      const BATCH = 5;
      for (let i = 0; i < entries.length; i += BATCH) {
        if (cancelled) break;
        const batch = entries.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(({ cls, topic }) =>
            axios.get(`${API_BASE}/teacher/tasks/by-class/`, {
              params: { task_class: cls, topic_number: topic },
              ...authHeaders()
            })
          )
        );
        results.forEach((r, idx) => {
          const { cls, topic } = batch[idx];
          const key = `${cls}::${topic}`;
          cache[key] = r.status === 'fulfilled'
            ? r.value.data.some(t => hasExamKeyword(t.content))
            : false;
        });
      }
      if (!cancelled) {
        setExamCache(cache);
        setLoadingExamCache(false);
      }
    };
    fetchExamData();
    return () => { cancelled = true; };
  }, [examFilter, meta]);

  const classes = useMemo(() => {
    if (!meta) return [];
    return Object.keys(meta).sort((a, b) => {
      const aN = parseInt(a), bN = parseInt(b);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      return a.localeCompare(b);
    });
  }, [meta]);

  const filteredClasses = useMemo(() => {
    let result = classes.filter(cls =>
      cls.toLowerCase().includes(classSearch.toLowerCase())
    );
    if (examFilter) {
      if (Object.keys(examCache).length === 0) return result;
      result = result.filter(cls => {
        const classMeta = meta?.[cls];
        if (!classMeta) return false;
        return Object.keys(classMeta).some(topic => examCache[`${cls}::${topic}`]);
      });
    }
    return result;
  }, [classes, classSearch, examFilter, examCache, meta]);

  const topics = useMemo(() => {
    if (!meta || !selectedClass) return [];
    const classMeta = meta[selectedClass];
    if (!classMeta) return [];
    return Object.keys(classMeta).sort();
  }, [meta, selectedClass]);

  const filteredTopics = useMemo(() => {
    let result = topics.filter(topic =>
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    );
    if (examFilter && Object.keys(examCache).length > 0) {
      result = result.filter(topic => examCache[`${selectedClass}::${topic}`]);
    }
    return result;
  }, [topics, topicSearch, examFilter, examCache, selectedClass]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      result = result.filter(t =>
        t.content?.toLowerCase().includes(q) ||
        t.answer?.toLowerCase().includes(q) ||
        t.id?.toString().includes(q)
      );
    }
    if (examFilter) {
      result = result.filter(t => hasExamKeyword(t.content));
    }
    return result;
  }, [tasks, taskSearch, examFilter]);

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setSelectedTopic(null);
    setTasks([]);
    setTopicSearch('');
  };

  const handleSelectTopic = async (cls, topic) => {
    setSelectedTopic(topic);
    setTaskSearch('');
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/tasks/by-class/`,
        { params: { task_class: cls, topic_number: topic }, ...authHeaders() }
      );
      setTasks(res.data);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const tasksCountByTopic = (cls, topic) => {
    if (!meta?.[cls]?.[topic]) return 0;
    const sections = meta[cls][topic];
    if (typeof sections === 'object') {
      return Object.values(sections).reduce((sum, count) => sum + count, 0);
    }
    return sections;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white dark:text-zinc-950" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">Банк заданий</h2>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mt-1">
                {selectedClass
                  ? `${selectedClass} раздел${selectedTopic ? ` → ${selectedTopic}` : ' → выберите подраздел'}`
                  : `${classes.length} разделов доступно`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExamFilter(!examFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${ examFilter ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-500/50" }`}
            >
              {examFilter ? "✓ Экзамен" : "ЦТ/ЦЭ/РТ"}
            </button>
            {(selectedClass || selectedTopic) && (
              <button onClick={() => {
                if (selectedTopic) { setSelectedTopic(null); setTasks([]); setTaskSearch(''); setExamFilter(false); }
                else { setSelectedClass(null); setClassSearch(''); }
              }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-all">
                <ChevronRight size={14} className="rotate-180" />
                {selectedTopic ? 'К подразделам' : 'Ко всем разделам'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!selectedClass && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input type="text" placeholder="Поиск раздела..." value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" />
          </div>
          {examFilter && loadingExamCache ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-zinc-400 dark:text-zinc-500 text-xs">Анализ заданий...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map(cls => {
              const topicsCount = meta?.[cls] ? Object.keys(meta[cls]).length : 0;
              const totalTasks = meta?.[cls]
                ? Object.values(meta[cls]).reduce((sum, t) => {
                    if (typeof t === 'object') return sum + Object.values(t).reduce((a, b) => a + b, 0);
                    return sum + t;
                  }, 0)
                : 0;
              return (
                <button key={cls} onClick={() => handleSelectClass(cls)}
                  className="w-full bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:shadow-lg dark:hover:shadow-sm transition-all p-5 text-left">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm truncate">{cls} раздел</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{topicsCount} подразделов</span>
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{totalTasks} заданий</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
          )}
        </div>
      )}

      {selectedClass && !selectedTopic && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input type="text" placeholder="Поиск подраздела..." value={topicSearch}
              onChange={e => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTopics.map((topic, index) => {
              const count = tasksCountByTopic(selectedClass, topic);
              return (
                <button key={topic} onClick={() => handleSelectTopic(selectedClass, topic)}
                  className="group p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:shadow-lg transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-semibold text-sm shrink-0">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-700 dark:text-zinc-200 text-sm leading-tight truncate">{topic}</p>
                      <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5">{count} заданий</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedClass && selectedTopic && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input type="text" placeholder="Поиск по тексту задания..." value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" />
            </div>
            <button
              onClick={() => setExamFilter(!examFilter)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${ examFilter ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-500/50" }`}
            >
              {examFilter ? "✓ Экзамен" : "ЦТ/ЦЭ/РТ"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-500">
              {taskSearch ? `Найдено: ${filteredTasks.length} из ${tasks.length}` : `${tasks.length} заданий`}
            </span>
          </div>
          <div className="space-y-4">
            {filteredTasks.map((t, index) => {
              const isSelected = selectedTasks.some((st) => st.id === t.id);
              return (
                <div key={t.id} className={`rounded-3xl border transition-all ${isSelected ? "bg-zinc-50 dark:bg-zinc-900/20 border-zinc-300 dark:border-zinc-500/50 shadow-lg dark:shadow-sm" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600"}`}>
                  <div className="p-6 space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[10px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-300">
                        Задание №{index + 1}
                      </h4>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">ID: {t.id}</span>
                        <div className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${getDifficultyColor(t.difficulty)}`}>LVL {t.difficulty || "?"}</div>
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">{t.is_open_answer ? "Открытый" : "Тест"}</span>
                      </div>
                    </div>

                    <div className="text-zinc-900 dark:text-zinc-200 text-base leading-relaxed">
                      <MarkdownRenderer>{t.content}</MarkdownRenderer>
                    </div>
                    {!t.is_open_answer && t.options && (
                      <div className="space-y-2">
                        {Array.isArray(t.options) ? t.options.map((opt, i) => (
                          <div key={i} className="flex items-start gap-3 text-zinc-900 dark:text-zinc-200 font-bold">
                            <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{i+1}.</span>
                            <span><MarkdownRenderer>{opt}</MarkdownRenderer></span>
                          </div>
                        )) : (
                          <MarkdownRenderer>{t.options}</MarkdownRenderer>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Ответ:</span>
                      <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{t.answer}</span>
                      {t.hint && <button onClick={() => onToggleHint(t.id)} className="px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">Подсказка</button>}
                      {t.solution && <button onClick={() => onToggleSolution(t.id)} className="px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">Решение</button>}
                      <button onClick={() => onTaskToggle(t)} className={`ml-auto px-5 py-2.5 rounded-2xl text-[10px] font-semibold transition-all active:scale-95 ${isSelected ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm dark:shadow-sm" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-white"}`}>
                        {isSelected ? "✓ В тесте" : "+ В тест"}
                      </button>
                    </div>
                    {openHints[t.id] && (
                      <div className="p-5 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/40">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-tight flex items-center gap-2 mb-3">
                          <span>Подсказка</span>
                        </span>
                        <div className="text-zinc-900 dark:text-zinc-200"><MarkdownRenderer>{t.hint}</MarkdownRenderer></div>
                      </div>
                    )}
                    {openSolutions[t.id] && (
                      <div className="p-5 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/40">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-tight flex items-center gap-2 mb-3">
                          <span>Решение</span>
                        </span>
                        <div className="text-zinc-900 dark:text-zinc-200"><MarkdownRenderer>{t.solution}</MarkdownRenderer></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!loading && tasks.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="font-semibold text-zinc-400 dark:text-zinc-500">Нет заданий</p>
            </div>
          )}
          {loading && (
            <div className="text-center py-16 space-y-3">
              <p className="font-semibold text-zinc-400 dark:text-zinc-500">Загрузка...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}