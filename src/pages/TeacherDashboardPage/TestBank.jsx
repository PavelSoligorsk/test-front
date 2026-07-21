import axios from 'axios';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, GraduationCap } from 'lucide-react';
import { API_URL } from '../../shared/config';
import { MarkdownPreview } from './MarkdownPreview';

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return "text-red-500 bg-red-50 border-red-100";
  if (lvl >= 3) return "text-amber-500 bg-amber-50 border-amber-100";
  return "text-emerald-500 bg-emerald-50 border-emerald-100";
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

  const getToken = () => {
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      return session?.token || session?.access_token;
    } catch { return null; }
  };

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

  useEffect(() => {
    axios.get(`${API_URL}/teacher/tasks-meta`, authHeaders())
      .then(res => setMeta(res.data))
      .catch(console.error);
  }, []);

  const classes = useMemo(() => {
    if (!meta) return [];
    return Object.keys(meta).sort((a, b) => {
      const aN = parseInt(a), bN = parseInt(b);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      return a.localeCompare(b);
    });
  }, [meta]);

  const filteredClasses = classes.filter(cls =>
    cls.toLowerCase().includes(classSearch.toLowerCase())
  );

  const topics = useMemo(() => {
    if (!meta || !selectedClass) return [];
    const classMeta = meta[selectedClass];
    if (!classMeta) return [];
    return Object.keys(classMeta).sort();
  }, [meta, selectedClass]);

  const filteredTopics = topics.filter(topic =>
    topic.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredTasks = useMemo(() => {
    if (!taskSearch) return tasks;
    const q = taskSearch.toLowerCase();
    return tasks.filter(t =>
      t.content?.toLowerCase().includes(q) ||
      t.answer?.toLowerCase().includes(q) ||
      t.id?.toString().includes(q)
    );
  }, [tasks, taskSearch]);

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
        `${API_URL}/teacher/tasks/by-class/${cls}/topic/${topic}`,
        authHeaders()
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
      <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Банк заданий</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {selectedClass
                  ? `${selectedClass} раздел${selectedTopic ? ` → ${selectedTopic}` : ' → выберите подраздел'}`
                  : `${classes.length} разделов доступно`}
              </p>
            </div>
          </div>
          {(selectedClass || selectedTopic) && (
            <button onClick={() => {
              if (selectedTopic) { setSelectedTopic(null); setTasks([]); setTaskSearch(''); }
              else { setSelectedClass(null); setClassSearch(''); }
            }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all">
              <ChevronRight size={14} className="rotate-180" />
              {selectedTopic ? 'К подразделам' : 'Ко всем разделам'}
            </button>
          )}
        </div>
      </div>

      {!selectedClass && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Поиск раздела..." value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
          </div>
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
                  className="w-full bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all p-5 text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-black text-lg shrink-0">{cls}</div>
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

      {selectedClass && !selectedTopic && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Поиск подраздела..." value={topicSearch}
              onChange={e => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTopics.map((topic, index) => {
              const count = tasksCountByTopic(selectedClass, topic);
              return (
                <button key={topic} onClick={() => handleSelectTopic(selectedClass, topic)}
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

      {selectedClass && selectedTopic && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Поиск по тексту задания..." value={taskSearch}
              onChange={e => setTaskSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              {taskSearch ? `Найдено: ${filteredTasks.length} из ${tasks.length}` : `${tasks.length} заданий`}
            </span>
          </div>
          <div className="space-y-4">
            {filteredTasks.map((t, index) => {
              const isSelected = selectedTasks.some((st) => st.id === t.id);
              return (
                <div key={t.id} className={`group p-4 md:p-6 rounded-2xl border transition-all ${isSelected ? "bg-emerald-50 border-emerald-300 shadow-lg" : "bg-slate-50 border-transparent hover:border-slate-200"}`}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">№ {index + 1}</span>
                      <span className="text-[9px] text-slate-400">ID: {t.id}</span>
                      <div className={`px-2 py-1 rounded-lg border text-[9px] font-black ${getDifficultyColor(t.difficulty)}`}>LVL {t.difficulty || "?"}</div>
                      <span className="text-[9px] text-slate-400">{t.is_open_answer ? "Открытый" : "Тест"}</span>
                    </div>
                    <MarkdownPreview text={t.content} title="Условие" />
                    {!t.is_open_answer && t.options && (
                      <div className="pl-4 border-l-2 border-emerald-100">
                        <MarkdownPreview text={Array.isArray(t.options) ? t.options.map((opt, i) => `**${i+1}.** ${opt}`).join("\n\n") : t.options} title="Варианты" />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-600">Ответ:</span>
                        <span className="text-sm font-black text-emerald-700">{t.answer}</span>
                      </div>
                      {t.hint && <button onClick={() => onToggleHint(t.id)} className="px-3 py-2 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-black hover:bg-amber-100">Подсказка</button>}
                      {t.solution && <button onClick={() => onToggleSolution(t.id)} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-100">Решение</button>}
                      <button onClick={() => onTaskToggle(t)} className={`ml-auto px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"}`}>
                        {isSelected ? "✓ В тесте" : "+ В тест"}
                      </button>
                    </div>
                    {openHints[t.id] && <MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" />}
                    {openSolutions[t.id] && <MarkdownPreview text={t.solution} title="РЕШЕНИЕ" type="solution" />}
                  </div>
                </div>
              );
            })}
          </div>
          {!loading && tasks.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="font-black text-slate-400 uppercase">Нет заданий</p>
            </div>
          )}
          {loading && (
            <div className="text-center py-16 space-y-3">
              <p className="font-black text-slate-400 uppercase">Загрузка...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
