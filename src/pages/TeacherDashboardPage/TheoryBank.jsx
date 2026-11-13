import { useState, useEffect, useMemo } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { NavTile, SearchField } from '../../shared/ui';
import PickerTaskCard from '../../features/tasks/PickerTaskCard';
import { fetchTeacherTasksBySection } from '../../features/tasks/api';

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
            fetchTeacherTasksBySection(topicKey, section).then((data) => ({ data }))
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
    return [...availableTopics[activeTopic].sections].sort();
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

  const loadSectionTasks = async (topic, section) => {
    setLoadingTasks(true);
    setTaskSearch("");
    try {
      const res = { data: await fetchTeacherTasksBySection(topic, section) };
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
          <SearchField value={topicSearch} onChange={setTopicSearch} placeholder="Поиск темы..." />
          {examFilter && loadingExamCache ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-600 dark:border-t-zinc-500 rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-zinc-400 dark:text-zinc-500 text-xs">Анализ заданий...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => (
              <NavTile
                key={topic.key}
                title={topic.label}
                meta={`${topic.sections.length} разделов · ${topic.count} заданий`}
                onClick={() => setActiveTopic(topic.key)}
              />
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
          <SearchField value={sectionSearch} onChange={setSectionSearch} placeholder="Поиск раздела..." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSections.map((section, index) => (
              <NavTile
                key={section}
                index={index + 1}
                title={section}
                meta={`${tasksMeta?.[activeTopic]?.[section] ?? 0} заданий`}
                onClick={() => {
                  setActiveSection(section);
                  loadSectionTasks(activeTopic, section);
                }}
              />
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
            <SearchField className="flex-1" value={taskSearch} onChange={setTaskSearch} placeholder="Поиск по тексту задания..." />
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
              {filteredTasks.map((task, index) => (
                <PickerTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  selected={selectedTasks.some((item) => item.id === task.id)}
                  hintOpen={!!openHints?.[task.id]}
                  solutionOpen={!!openSolutions?.[task.id]}
                  onToggleHint={onToggleHint}
                  onToggleSolution={onToggleSolution}
                  onToggle={onTaskToggle}
                />
              ))}

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