import axios from 'axios';
import { API_BASE } from '../../shared/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { MarkdownRenderer } from '../../shared/ui';

const EXAM_KEYWORDS = ['ЦТ', 'ЦЭ', 'РЦЭ', 'ДРТ', 'РТ'];

const hasExamKeyword = (text) => {
  if (!text) return false;
  return EXAM_KEYWORDS.some((kw) => text.includes(kw));
};

const MAIN_TOPICS = {
  numbers: "Числа и вычисления",
  expressions: "Выражения и их преобразования",
  equations: "Уравнения и неравенства",
  functions: "Координаты и функции",
  geometry: "Геометрия",
  planim: "Планиметрия",
  stereo: "Стереометрия",
  text: "Текстовые задачи",
  inequalities: "Неравенства",
};

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800";
  if (lvl >= 3) return "text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800";
  return "text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800";
};

export default function TheoryBank({ 
  tasksMeta, 
  onTaskToggle, 
  selectedTasks, 
  openSolutions, 
  openHints, 
  onToggleSolution, 
  onToggleHint 
}) {
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [examFilter, setExamFilter] = useState(false);
  const [examCache, setExamCache] = useState({});  // { "topicKey::section": true/false }
  const [loadingExamCache, setLoadingExamCache] = useState(false);
  const [sectionTasks, setSectionTasks] = useState({});
  const [loadingTasks, setLoadingTasks] = useState(false);

  const availableTopics = useMemo(() => {
    if (!tasksMeta) return {};
    const topicsMap = {};
    Object.keys(tasksMeta).forEach((topicKey) => {
      const sectionsData = tasksMeta[topicKey];
      const sections = Object.keys(sectionsData);
      const totalCount = Object.values(sectionsData).reduce((sum, count) => sum + count, 0);
      topicsMap[topicKey] = {
        key: topicKey,
        label: MAIN_TOPICS[topicKey] || topicKey,
        sections,
        count: totalCount,
      };
    });
    return topicsMap;
  }, [tasksMeta]);

  // При включении фильтра загружаем задания для всех topic/section чтобы знать где есть ЦТ/ЦЭ/РТ
  useEffect(() => {
    if (!examFilter || !tasksMeta) return;
    let cancelled = false;
    const fetchExamData = async () => {
      setLoadingExamCache(true);
      const cache = {};
      const entries = [];
      for (const topicKey of Object.keys(tasksMeta)) {
        const sectionsData = tasksMeta[topicKey];
        for (const section of Object.keys(sectionsData)) {
          entries.push({ topicKey, section });
        }
      }
      const BATCH = 5;
      for (let i = 0; i < entries.length; i += BATCH) {
        if (cancelled) break;
        const batch = entries.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(({ topicKey, section }) =>
            axios.get(
              `${API_BASE}/teacher/tasks/by-topic/${encodeURIComponent(topicKey)}/section/${encodeURIComponent(section)}`,
              getAuthHeaders()
            )
          )
        );
        results.forEach((r, idx) => {
          const { topicKey, section } = batch[idx];
          const key = `${topicKey}::${section}`;
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
  }, [examFilter, tasksMeta]);

  const filteredTopics = useMemo(() => {
    let result = Object.values(availableTopics).filter(
      (topic) => topic.label.toLowerCase().includes(topicSearch.toLowerCase()) || 
                 topic.key.toLowerCase().includes(topicSearch.toLowerCase())
    );
    if (examFilter && Object.keys(examCache).length > 0) {
      result = result.filter(topic =>
        topic.sections.some(section => examCache[`${topic.key}::${section}`])
      );
    }
    return result;
  }, [availableTopics, topicSearch, examFilter, examCache]);

  const sections = useMemo(() => {
    if (!activeTopic || !availableTopics[activeTopic]) return [];
    return availableTopics[activeTopic].sections.sort();
  }, [activeTopic, availableTopics]);

  const filteredSections = useMemo(() => {
    let result = sections.filter((section) =>
      section.toLowerCase().includes(sectionSearch.toLowerCase())
    );
    if (examFilter && Object.keys(examCache).length > 0) {
      result = result.filter(section => examCache[`${activeTopic}::${section}`]);
    }
    return result;
  }, [sections, sectionSearch, examFilter, examCache, activeTopic]);

  const filteredTasks = useMemo(() => {
    const tasks = sectionTasks[`${activeTopic}/${activeSection}`] || [];
    let result = tasks;
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      result = result.filter((t) => 
        t.content?.toLowerCase().includes(q) || 
        t.answer?.toLowerCase().includes(q) || 
        t.id?.toString().includes(q)
      );
    }
    if (examFilter) {
      result = result.filter(t => hasExamKeyword(t.content));
    }
    return result;
  }, [sectionTasks, activeTopic, activeSection, taskSearch, examFilter]);

  const getAuthHeaders = () => {
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.access_token || session?.token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch { return {}; }
  };

  const loadSectionTasks = async (topic, section) => {
    setLoadingTasks(true);
    setTaskSearch("");
    try {
      const res = await axios.get(
        `${API_BASE}/teacher/tasks/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`,
        getAuthHeaders()
      );
      setSectionTasks((prev) => ({ ...prev, [`${topic}/${section}`]: res.data }));
    } catch (e) {
      console.error('Error loading tasks:', e);
      setSectionTasks((prev) => ({ ...prev, [`${topic}/${section}`]: [] }));
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleBackToSections = () => {
    setActiveSection(null);
    setTaskSearch("");
  };

  const handleBackToTopics = () => {
    setActiveTopic(null);
    setSectionSearch("");
    setActiveSection(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Заголовок */}
      <div className="bg-white dark:bg-[#09090b] rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white dark:text-zinc-950" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                Банк заданий
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mt-1">
                {activeTopic ? 
                  `${availableTopics[activeTopic]?.label || activeTopic}${activeSection ? ` → ${activeSection}` : " → выберите раздел"}` : 
                  `${Object.keys(availableTopics).length} тем доступно`
                }
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
            {(activeTopic || activeSection) && (
              <button 
                onClick={activeSection ? handleBackToSections : handleBackToTopics}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-all"
              >
                <ChevronRight size={14} className="rotate-180" />
                {activeSection ? "К разделам" : "Ко всем темам"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Выбор темы */}
      {!activeTopic && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Поиск темы..." 
              value={topicSearch} 
              onChange={(e) => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
            />
          </div>
          {examFilter && loadingExamCache ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-500 rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-zinc-400 dark:text-zinc-500 text-xs">Анализ заданий...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => (
              <button 
                key={topic.key} 
                onClick={() => setActiveTopic(topic.key)}
                className="w-full bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:shadow-lg dark:hover:shadow-sm transition-all p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm truncate">{topic.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{topic.sections.length} разделов</span>
                      <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{topic.count} заданий</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {filteredTopics.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-400 dark:text-zinc-500 text-sm">Темы не найдены</p>
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* Выбор раздела */}
      {activeTopic && !activeSection && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Поиск раздела..." 
              value={sectionSearch} 
              onChange={(e) => setSectionSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSections.map((section, index) => (
              <button 
                key={index} 
                onClick={() => {
                  setActiveSection(section);
                  loadSectionTasks(activeTopic, section);
                }}
                className="group p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-500/50 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-50 dark:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-semibold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-700 dark:text-zinc-200 text-sm leading-tight truncate">{section}</p>
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {tasksMeta?.[activeTopic]?.[section] ?? 0} заданий
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {filteredSections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-400 dark:text-zinc-500 text-sm">Разделы не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Список заданий */}
      {activeTopic && activeSection && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input 
                type="text" 
                placeholder="Поиск по тексту задания..." 
                value={taskSearch} 
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
              />
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
              {taskSearch ? 
                `Найдено: ${filteredTasks.length} из ${(sectionTasks[`${activeTopic}/${activeSection}`] || []).length}` : 
                `${(sectionTasks[`${activeTopic}/${activeSection}`] || []).length} заданий`
              }
            </span>
          </div>

          {loadingTasks ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-500 rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-zinc-400 dark:text-zinc-500">Загрузка заданий...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((t, index) => {
                const isSelected = selectedTasks.some((st) => st.id === t.id);
                return (
                  <div 
                    key={t.id} 
                    className={`rounded-3xl border transition-all ${ isSelected ? "bg-zinc-50 dark:bg-zinc-900/20 border-zinc-300 dark:border-zinc-500/50 shadow-lg" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600" }`}
                  >
                    <div className="p-6 space-y-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[10px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-300">
                          Задание №{index + 1}
                        </h4>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">ID: {t.id}</span>
                          <div className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${getDifficultyColor(t.difficulty)}`}>
                            LVL {t.difficulty || "?"}
                          </div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded-lg">
                            {t.is_open_answer ? "Открытый" : "Тест"}
                          </span>
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
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-400">{t.answer}</span>
                        {t.hint && (
                          <button 
                            onClick={() => onToggleHint(t.id)} 
                            className="px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                          >
                            Подсказка
                          </button>
                        )}
                        {t.solution && (
                          <button 
                            onClick={() => onToggleSolution(t.id)} 
                            className="px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                          >
                            Решение
                          </button>
                        )}
                        <button 
                          onClick={() => onTaskToggle(t)} 
                          className={`ml-auto px-5 py-2.5 rounded-2xl text-[10px] font-semibold transition-all active:scale-95 ${ isSelected ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-white" }`}
                        >
                          {isSelected ? "✓ В тесте" : "+ В тест"}
                        </button>
                      </div>
                      
                      {openHints?.[t.id] && (
                        <div className="p-5 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/40">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-tight flex items-center gap-2 mb-3">
                            <span>Подсказка</span>
                          </span>
                          <div className="text-zinc-900 dark:text-zinc-200"><MarkdownRenderer>{t.hint}</MarkdownRenderer></div>
                        </div>
                      )}
                      
                      {openSolutions?.[t.id] && (
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

              {(!sectionTasks[`${activeTopic}/${activeSection}`] || 
                sectionTasks[`${activeTopic}/${activeSection}`].length === 0) && 
                !loadingTasks && (
                <div className="text-center py-16 space-y-3">
                  <p className="font-semibold text-zinc-400 dark:text-zinc-500">Нет заданий в этом разделе</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}