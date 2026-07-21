import axios from 'axios';
import { API_URL } from '../../shared/config';
import React, { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronRight } from 'lucide-react';
import { MarkdownRenderer } from '../../shared/ui';

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
  if (lvl >= 4) return "text-red-500 bg-red-50 border-red-100";
  if (lvl >= 3) return "text-amber-500 bg-amber-50 border-amber-100";
  return "text-emerald-500 bg-emerald-50 border-emerald-100";
};

// Компонент для рендеринга Markdown
// (используем MarkdownRenderer из shared/ui)

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

  const filteredTopics = Object.values(availableTopics).filter(
    (topic) => topic.label.toLowerCase().includes(topicSearch.toLowerCase()) || 
               topic.key.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const sections = useMemo(() => {
    if (!activeTopic || !availableTopics[activeTopic]) return [];
    return availableTopics[activeTopic].sections.sort();
  }, [activeTopic, availableTopics]);

  const filteredSections = sections.filter((section) =>
    section.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const filteredTasks = useMemo(() => {
    const tasks = sectionTasks[`${activeTopic}/${activeSection}`] || [];
    if (!taskSearch) return tasks;
    const q = taskSearch.toLowerCase();
    return tasks.filter((t) => 
      t.content?.toLowerCase().includes(q) || 
      t.answer?.toLowerCase().includes(q) || 
      t.id?.toString().includes(q)
    );
  }, [sectionTasks, activeTopic, activeSection, taskSearch]);

  const loadSectionTasks = async (topic, section) => {
    setLoadingTasks(true);
    setTaskSearch("");
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.access_token || session?.token;
      
      const res = await axios.get(
        `${API_URL}/teacher/tasks/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSectionTasks((prev) => ({ ...prev, [`${topic}/${section}`]: res.data }));
    } catch (e) {
      console.error('Error loading tasks:', e);
      setSectionTasks((prev) => ({ ...prev, [`${topic}/${section}`]: [] }));
    } finally {
      setLoadingTasks(false);
    }
  };

  // Функция для возврата к выбору раздела
  const handleBackToSections = () => {
    setActiveSection(null);
    setTaskSearch("");
  };

  // Функция для возврата к выбору темы
  const handleBackToTopics = () => {
    setActiveTopic(null);
    setSectionSearch("");
    setActiveSection(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                Банк заданий
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {activeTopic ? 
                  `${availableTopics[activeTopic]?.label || activeTopic}${activeSection ? ` → ${activeSection}` : " → выберите раздел"}` : 
                  `${Object.keys(availableTopics).length} тем доступно`
                }
              </p>
            </div>
          </div>
          {(activeTopic || activeSection) && (
            <button 
              onClick={activeSection ? handleBackToSections : handleBackToTopics}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all"
            >
              <ChevronRight size={14} className="rotate-180" />
              {activeSection ? "К разделам" : "Ко всем темам"}
            </button>
          )}
        </div>
      </div>

      {/* Выбор темы */}
      {!activeTopic && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск темы..." 
              value={topicSearch} 
              onChange={(e) => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => (
              <button 
                key={topic.key} 
                onClick={() => setActiveTopic(topic.key)}
                className="w-full bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-sm uppercase truncate">{topic.label}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">{topic.sections.length} разделов</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400">{topic.count} заданий</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {filteredTopics.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">Темы не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Выбор раздела */}
      {activeTopic && !activeSection && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск раздела..." 
              value={sectionSearch} 
              onChange={(e) => setSectionSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" 
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
                className="group p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm leading-tight truncate">{section}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                      {tasksMeta?.[activeTopic]?.[section] ?? 0} заданий
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </button>
            ))}
          </div>
          {filteredSections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">Разделы не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Список заданий */}
      {activeTopic && activeSection && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск по тексту задания..." 
              value={taskSearch} 
              onChange={(e) => setTaskSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              {taskSearch ? 
                `Найдено: ${filteredTasks.length} из ${(sectionTasks[`${activeTopic}/${activeSection}`] || []).length}` : 
                `${(sectionTasks[`${activeTopic}/${activeSection}`] || []).length} заданий`
              }
            </span>
          </div>

          {loadingTasks ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="font-black text-slate-400 uppercase">Загрузка заданий...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((t, index) => {
                const isSelected = selectedTasks.some((st) => st.id === t.id);
                return (
                  <div 
                    key={t.id} 
                    className={`rounded-[2rem] border transition-all ${
                      isSelected ? "bg-emerald-50 border-emerald-300 shadow-lg" : "bg-white border-slate-200 shadow-sm hover:border-slate-300"
                    }`}
                  >
                    <div className="p-6 space-y-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                          Задание №{index + 1}
                        </h4>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">ID: {t.id}</span>
                          <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-black ${getDifficultyColor(t.difficulty)}`}>
                            LVL {t.difficulty || "?"}
                          </div>
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {t.is_open_answer ? "Открытый" : "Тест"}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-900 text-base leading-relaxed">
                        <MarkdownRenderer>{t.content}</MarkdownRenderer>
                      </div>
                      
                      {!t.is_open_answer && t.options && (
                        <div className="space-y-2">
                          {Array.isArray(t.options) ? t.options.map((opt, i) => (
                            <div key={i} className="flex items-start gap-3 text-slate-900 font-bold">
                              <span className="text-slate-400 shrink-0">{i+1}.</span>
                              <span><MarkdownRenderer>{opt}</MarkdownRenderer></span>
                            </div>
                          )) : (
                            <MarkdownRenderer>{t.options}</MarkdownRenderer>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-black text-slate-500">Ответ:</span>
                        <span className="text-sm font-black text-slate-900">{t.answer}</span>
                        {t.hint && (
                          <button 
                            onClick={() => onToggleHint(t.id)} 
                            className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black hover:bg-slate-200 transition-all"
                          >
                            Подсказка
                          </button>
                        )}
                        {t.solution && (
                          <button 
                            onClick={() => onToggleSolution(t.id)} 
                            className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black hover:bg-slate-200 transition-all"
                          >
                            Решение
                          </button>
                        )}
                        <button 
                          onClick={() => onTaskToggle(t)} 
                          className={`ml-auto px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 ${
                            isSelected ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"
                          }`}
                        >
                          {isSelected ? "✓ В тесте" : "+ В тест"}
                        </button>
                      </div>
                      
                      {openHints?.[t.id] && (
                        <div className="p-5 rounded-[2rem] bg-amber-50/50 border border-amber-200/40">
                          <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-2 mb-3">
                            <span>Подсказка</span>
                          </span>
                          <div className="text-slate-900"><MarkdownRenderer>{t.hint}</MarkdownRenderer></div>
                        </div>
                      )}
                      
                      {openSolutions?.[t.id] && (
                        <div className="p-5 rounded-[2rem] bg-blue-50/50 border border-blue-200/40">
                          <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2 mb-3">
                            <span>Решение</span>
                          </span>
                          <div className="text-slate-900"><MarkdownRenderer>{t.solution}</MarkdownRenderer></div>
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
                  <p className="font-black text-slate-400 uppercase">Нет заданий в этом разделе</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}