// ==================== TeacherDashboard.jsx ====================
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Database, Users, LayoutDashboard, 
  Search, Send, Trash2, Edit3, CheckCircle2,
  XCircle, BookOpen, ClipboardList, GraduationCap,
  ChevronLeft, ArrowRight, Calendar, Trophy, Target,
  UserPlus, Clock, AlertCircle, CheckSquare, Square,
  Filter, ChevronRight
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { MarkdownPreview } from '../pages/AdminDashboard';

// ==================== КОНСТАНТЫ ====================
const MAIN_TOPICS = {
  'numbers': 'Числа и вычисления',
  'expressions': 'Выражения и их преобразования',
  'equations': 'Уравнения и неравенства',
  'functions': 'Координаты и функции',
  'geometry': 'Геометрия',
  'planim': 'Планиметрия',
  'stereo': 'Стереометрия',
  'text': 'Текстовые задачи',
  'inequalities': 'Неравенства'
};

const API_BASE = 'https://tests-production-46d5.up.railway.app';

// ==================== КОМПОНЕНТ: ТЕОРЕТИЧЕСКИЙ БАНК (ДИНАМИЧЕСКИЙ) ====================
const TheoryBank = ({ tasks, onTaskToggle, selectedTasks, openSolutions, openHints, onToggleSolution, onToggleHint }) => {
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [topicSearch, setTopicSearch] = useState('');
  const [sectionSearch, setSectionSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  // Все задания (плоский массив)
  const allTasks = useMemo(() => {
    if (!tasks) return [];
    // Если tasks приходит как объект с полем all - берём его
    if (tasks.all) return tasks.all;
    // Если tasks приходит как объект с группировкой по классам
    if (tasks.grouped) {
      const flat = [];
      Object.values(tasks.grouped).forEach(classTopics => {
        Object.values(classTopics).forEach(topicTasks => {
          flat.push(...topicTasks);
        });
      });
      return flat;
    }
    return [];
  }, [tasks]);

  // Динамически собираем все топики из заданий
  const availableTopics = useMemo(() => {
    const topicsMap = {};
    allTasks.forEach(task => {
      if (!task.topic) return;
      
      if (!topicsMap[task.topic]) {
        topicsMap[task.topic] = {
          key: task.topic,
          label: MAIN_TOPICS[task.topic] || task.topic,
          sections: new Set()
        };
      }
      if (task.section) {
        topicsMap[task.topic].sections.add(task.section);
      }
    });
    return topicsMap;
  }, [allTasks]);

  // Фильтрация топиков по поиску
  const filteredTopics = Object.values(availableTopics).filter(topic => 
    topic.label.toLowerCase().includes(topicSearch.toLowerCase()) ||
    topic.key.toLowerCase().includes(topicSearch.toLowerCase())
  );

  // Секции выбранного топика
  const sections = useMemo(() => {
    if (!activeTopic || !availableTopics[activeTopic]) return [];
    return Array.from(availableTopics[activeTopic].sections).sort();
  }, [activeTopic, availableTopics]);

  const filteredSections = sections.filter(section => 
    section.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  // Задания выбранной секции (фильтруем ТОЛЬКО по topic и section)
  const sectionTasks = useMemo(() => {
    if (!activeTopic || !activeSection) return [];
    return allTasks.filter(t => 
      t.topic === activeTopic && 
      t.section === activeSection
    );
  }, [allTasks, activeTopic, activeSection]);

  // Поиск внутри заданий секции
  const filteredTasks = sectionTasks.filter(t => {
    if (!taskSearch) return true;
    const q = taskSearch.toLowerCase();
    return (
      t.content?.toLowerCase().includes(q) ||
      t.answer?.toLowerCase().includes(q) ||
      t.id?.toString().includes(q)
    );
  }).sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    return (a.difficulty || 0) - (b.difficulty || 0);
  });

  const getDifficultyColor = (lvl) => {
    if (lvl >= 4) return 'text-red-500 bg-red-50 border-red-100';
    if (lvl >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  const getTopicIcon = (topicKey) => {
    const icons = {
      'numbers': '🔢', 'expressions': '📝', 'equations': '⚖️',
      'inequalities': '≷', 'functions': '📈', 'text': '📖',
      'planim': '📐', 'stereo': '🧊', 'geometry': '📏'
    };
    return icons[topicKey] || '📚';
  };

  const getTopicColor = (topicKey) => {
    const colors = {
      'numbers': 'from-orange-500 to-red-500',
      'expressions': 'from-purple-500 to-pink-500',
      'equations': 'from-blue-500 to-cyan-500',
      'inequalities': 'from-yellow-500 to-amber-500',
      'functions': 'from-emerald-500 to-teal-500',
      'text': 'from-sky-500 to-blue-500',
      'planim': 'from-green-500 to-lime-500',
      'stereo': 'from-indigo-500 to-violet-500',
      'geometry': 'from-rose-500 to-orange-500'
    };
    return colors[topicKey] || 'from-slate-500 to-slate-600';
  };

  const handleBack = () => {
    if (activeSection) {
      setActiveSection(null);
      setTaskSearch('');
    } else if (activeTopic) {
      setActiveTopic(null);
      setSectionSearch('');
    }
  };

  const getTopicTaskCount = (topicKey) => {
    return allTasks.filter(t => t.topic === topicKey).length;
  };

  const getSectionTaskCount = (section) => {
    if (!activeTopic) return 0;
    return allTasks.filter(t => t.topic === activeTopic && t.section === section).length;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Верхняя панель */}
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
                {activeTopic 
                  ? `${availableTopics[activeTopic]?.label || activeTopic}${activeSection ? ` → ${activeSection}` : ' → выберите раздел'}`
                  : `${Object.keys(availableTopics).length} тем доступно`
                }
              </p>
            </div>
          </div>

          {(activeTopic || activeSection) && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all"
            >
              <ChevronRight size={14} className="rotate-180" />
              {activeSection ? 'К разделам' : 'Ко всем темам'}
            </button>
          )}
        </div>
      </div>

      {/* Уровень 1: ТОПИКИ */}
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
            {topicSearch && (
              <button 
                onClick={() => setTopicSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          {filteredTopics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map(topic => (
                <button
                  key={topic.key}
                  onClick={() => setActiveTopic(topic.key)}
                  className="group relative bg-white rounded-[2rem] border-2 border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all overflow-hidden text-left w-full"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${getTopicColor(topic.key)}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${getTopicColor(topic.key)} rounded-xl flex items-center justify-center text-white shadow-lg text-2xl`}>
                        {getTopicIcon(topic.key)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-slate-800 text-sm uppercase">
                          {topic.label}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400">
                            {topic.sections.size} разделов
                          </span>
                          <span className="text-[9px] text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {getTopicTaskCount(topic.key)} заданий
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-[9px] font-black uppercase text-slate-400">Открыть</span>
                      <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                <Search size={40} className="text-slate-300" />
              </div>
              <p className="font-black text-slate-400 uppercase">
                {topicSearch ? 'Темы не найдены' : 'Нет доступных тем'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Уровень 2: СЕКЦИИ */}
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
            {sectionSearch && (
              <button 
                onClick={() => setSectionSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          {filteredSections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSections.map((section, index) => {
                const taskCount = getSectionTaskCount(section);
                return (
                  <button
                    key={index}
                    onClick={() => setActiveSection(section)}
                    className="group p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-700 text-sm leading-tight truncate">
                          {section}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                          {taskCount} заданий
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                <Search size={40} className="text-slate-300" />
              </div>
              <p className="font-black text-slate-400 uppercase">
                {sectionSearch ? 'Разделы не найдены' : 'Нет разделов'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Уровень 3: ЗАДАНИЯ */}
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
            {taskSearch && (
              <button 
                onClick={() => setTaskSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              {taskSearch 
                ? `Найдено: ${filteredTasks.length} из ${sectionTasks.length}`
                : `${sectionTasks.length} заданий`
              }
            </span>
          </div>

          {sectionTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((t, index) => {
                const isSolOpen = openSolutions[t.id];
                const isHintOpen = openHints[t.id];
                const isSelected = selectedTasks.some(st => st.id === t.id);

                return (
                  <div key={t.id} className={`group p-4 md:p-6 rounded-2xl border transition-all ${
                    isSelected ? 'bg-emerald-50 border-emerald-300 shadow-lg' : 'bg-slate-50 border-transparent hover:border-slate-200'
                  }`}>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          № {index + 1}
                        </span>
                        <span className="text-[9px] text-slate-400">ID: {t.id}</span>
                        
                        <div className={`px-2 py-1 rounded-lg border text-[9px] font-black ${getDifficultyColor(t.difficulty)}`}>
                          LVL {t.difficulty || '?'}
                        </div>
                        
                        <span className="text-[9px] text-slate-400">
                          {t.is_open_answer ? 'Открытый' : 'Тест'}
                        </span>
                      </div>

                      <MarkdownPreview text={t.content} title="Условие" />

                      {!t.is_open_answer && t.options && (
                        <div className="pl-4 border-l-2 border-emerald-100">
                          <MarkdownPreview
                            text={Array.isArray(t.options) 
                              ? t.options.map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')
                              : t.options
                            }
                            title="Варианты"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-600">Ответ:</span>
                          <span className="text-sm font-black text-emerald-700">{t.answer}</span>
                        </div>

                        {t.hint && (
                          <button 
                            onClick={() => onToggleHint(t.id)}
                            className="px-3 py-2 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-black hover:bg-amber-100"
                          >
                            Подсказка
                          </button>
                        )}

                        {t.solution && (
                          <button 
                            onClick={() => onToggleSolution(t.id)}
                            className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-100"
                          >
                            Решение
                          </button>
                        )}

                        <button
                          onClick={() => onTaskToggle(t)}
                          className={`ml-auto px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                            isSelected 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                        >
                          {isSelected ? '✓ В тесте' : '+ В тест'}
                        </button>
                      </div>

                      {isHintOpen && <MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" />}
                      {isSolOpen && <MarkdownPreview text={t.solution} title="РЕШЕНИЕ" type="solution" />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto">
                <Search size={32} className="text-slate-200" />
              </div>
              <p className="font-black text-slate-400 uppercase">
                Нет заданий
              </p>
              <p className="text-[10px] font-bold text-slate-300 uppercase">
                В этом разделе пока нет заданий
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
// ==================== МОДАЛЬНОЕ ОКНО НАЗНАЧЕНИЯ ====================
const AssignTestModal = ({ test, students, onClose, onAssign }) => {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleSubmit = () => {
    if (selectedStudents.length === 0) {
      alert('Выберите хотя бы одного ученика');
      return;
    }
    onAssign({
      test_id: test.id,
      user_ids: selectedStudents,
      due_date: dueDate || null
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Заголовок */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black text-slate-800">Назначить тест</h3>
              <p className="text-sm text-slate-500 mt-1">{test.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
              <XCircle size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Тело */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
      
          {/* Поиск учеников */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input
              type="text"
              placeholder="Поиск учеников..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Выбрать всех */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600"
          >
            {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? (
              <CheckSquare size={16} className="text-emerald-600" />
            ) : (
              <Square size={16} />
            )}
            Выбрать всех ({filteredStudents.length})
          </button>

          {/* Список учеников */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  selectedStudents.includes(student.id)
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {selectedStudents.includes(student.id) ? (
                  <CheckSquare size={18} className="text-emerald-600" />
                ) : (
                  <Square size={18} className="text-slate-300" />
                )}
                <div>
                  <div className="font-bold text-sm text-slate-800">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-[10px] text-slate-400">@{student.username}</div>
                </div>
                {student.tg_username && (
                  <span className="ml-auto text-[9px] text-blue-400">{student.tg_username}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Футер */}
        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
          >
            ОТМЕНА
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedStudents.length === 0}
            className="flex-1 p-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Send size={16} />
            НАЗНАЧИТЬ ({selectedStudents.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== КОМПОНЕНТ НАЗНАЧЕНИЙ ТЕСТА ====================
const TestAssignmentsPanel = ({ test, onClose }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const res = await axios.get(`${API_BASE}/teacher/test/${test.id}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(res.data);
    } catch (e) {
      console.error('Ошибка загрузки назначений:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!confirm('Отменить назначение?')) return;
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      await axios.delete(`${API_BASE}/teacher/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (e) {
      alert('Ошибка при удалении');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-800">Назначения теста</h3>
            <p className="text-sm text-slate-500">{test.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <XCircle size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Загрузка...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-bold">Нет назначений</p>
            </div>
          ) : (
            <div className="space-y-2">
  {assignments.map(assignment => (
    <div key={assignment.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="flex-1">
        <div className="font-bold text-sm text-slate-800">
          {assignment.student_name}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {assignment.is_completed ? (
            <>
              <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Выполнено
              </span>
              {assignment.best_score !== null && (
                <span className="text-[9px] text-slate-500">
                  {assignment.total_points} балл.
                </span>
              )}
            </>
          ) : (
            <span className="text-[9px] font-bold text-amber-600 flex items-center gap-1">
              <Clock size={12} /> Ожидается
            </span>
          )}
          {assignment.due_date && (
            <span className="text-[9px] text-slate-400">
              до {new Date(assignment.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => handleDelete(assignment.id)}
        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  ))}
</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('bank');
  const navigate = useNavigate();
  
  // Состояния
  const [tasks, setTasks] = useState([]);
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Банк заданий
  const [bankClass, setBankClass] = useState(null);
  const [bankTopic, setBankTopic] = useState(null);
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [bankClassSearch, setBankClassSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  
  // Конструктор тестов
  const [testForm, setTestForm] = useState({
    id: null,
    title: '',
    target_class: '',
    target_topic: '',
    is_autocompile: false,
    task_ids: [],
    is_active: true
  });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [testSearchTerm, setTestSearchTerm] = useState('');
  
  // Поиск учеников
  const [studentSearch, setStudentSearch] = useState('');
  
  // Модальные окна
  const [assignModalTest, setAssignModalTest] = useState(null);
  const [assignmentsModalTest, setAssignmentsModalTest] = useState(null);

  // Загрузка данных
  useEffect(() => {
    fetchTasks();
    fetchTests();
    fetchStudents();
  }, []);

  const getAuthHeaders = () => {
    try {
      const sessionStr = localStorage.getItem('edu_session');
      if (!sessionStr) return {};
      
      const session = JSON.parse(sessionStr);
      const token = session?.token || session?.access_token;
      
      if (!token) {
        console.warn('Токен не найден в сессии');
        return {};
      }
      
      return { Authorization: `Bearer ${token}` };
    } catch (e) {
      console.error('Ошибка чтения сессии:', e);
      return {};
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tasks-grouped`, { headers: getAuthHeaders() });
      setTasks(res.data);
    } catch (e) {
      console.error('Ошибка загрузки заданий:', e);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tests`, { headers: getAuthHeaders() });
      setTests(res.data);
    } catch (e) {
      console.error('Ошибка загрузки тестов:', e);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/students`, { headers: getAuthHeaders() });
      setStudents(res.data);
    } catch (e) {
      console.error('Ошибка загрузки учеников:', e);
    }
  };

  // Группировка заданий
  const groupedTasks = useMemo(() => {
    if (!tasks.grouped) return {};
    return tasks.grouped;
  }, [tasks]);

  const availableClasses = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => parseInt(a) - parseInt(b));
  }, [groupedTasks]);

  // Фильтрация классов
  const filteredClasses = availableClasses.filter(cls => 
    cls.toString().toLowerCase().includes(bankClassSearch.toLowerCase())
  );

  // Количество заданий в классе
  const classTaskCount = (cls) => {
    const topics = groupedTasks[cls];
    return topics ? Object.values(topics).reduce((sum, tasks) => sum + tasks.length, 0) : 0;
  };

  // Текущие задания и поиск по ним
  const currentTasks = bankTopic && groupedTasks[bankClass] ? groupedTasks[bankClass][bankTopic] : [];
  const filteredTasks = currentTasks.filter(t => {
    if (!taskSearch) return true;
    const q = taskSearch.toLowerCase();
    return (
      t.content?.toLowerCase().includes(q) ||
      t.answer?.toLowerCase().includes(q) ||
      t.id?.toString().includes(q)
    );
  }).sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
    return (a.difficulty || 0) - (b.difficulty || 0);
  });

  // Создание/обновление теста
  const handleTestSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...testForm,
      target_class: testForm.target_class,
      target_topic: testForm.target_topic,
      task_ids: selectedTasks.map(t => t.id)
    };

    try {
      if (testForm.id) {
        await axios.put(`${API_BASE}/teacher/tests/${testForm.id}`, payload, { headers: getAuthHeaders() });
        alert('Тест обновлён!');
      } else {
        await axios.post(`${API_BASE}/teacher/tests`, payload, { headers: getAuthHeaders() });
        alert('Тест создан!');
      }
      resetTestForm();
      fetchTests();
    } catch (e) {
      alert('Ошибка при сохранении теста');
    }
  };

  const resetTestForm = () => {
    setTestForm({
      id: null,
      title: '',
      target_class: '',
      target_topic: '',
      is_autocompile: false,
      task_ids: [],
      is_active: true
    });
    setSelectedTasks([]);
  };

  const handleEditTest = (test) => {
    setTestForm({
      id: test.id,
      title: test.title,
      target_class: test.target_class || '',
      target_topic: test.target_topic || '',
      is_autocompile: test.is_autocompile || false,
      task_ids: test.tasks?.map(t => t.id) || [],
      is_active: test.is_active
    });
    setSelectedTasks(test.tasks || []);
    setActiveTab('constructor');
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Удалить тест?')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/tests/${testId}`, { headers: getAuthHeaders() });
      setTests(prev => prev.filter(t => t.id !== testId));
    } catch (e) {
      alert('Ошибка при удалении');
    }
  };

  // Назначение теста
  const handleAssignTest = async (assignmentData) => {
    try {
      await axios.post(`${API_BASE}/teacher/assign-test`, assignmentData, { headers: getAuthHeaders() });
      alert(`Тест назначен ${assignmentData.user_ids.length} ученикам!`);
      setAssignModalTest(null);
    } catch (e) {
      alert('Ошибка при назначении теста');
      console.error(e);
    }
  };

  // Добавление/удаление заданий из теста
  const toggleTaskSelection = (task) => {
    setSelectedTasks(prev => {
      const exists = prev.find(t => t.id === task.id);
      if (exists) {
        return prev.filter(t => t.id !== task.id);
      } else {
        return [...prev, task];
      }
    });
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase();
    return fullName.includes(studentSearch.toLowerCase());
  });

  const getDifficultyColor = (lvl) => {
    if (lvl >= 4) return 'text-red-500 bg-red-50 border-red-100';
    if (lvl >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-gradient-to-br from-emerald-700 to-teal-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col gap-6 border-b-4 border-emerald-400">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-white/20 rounded-2xl md:rounded-3xl text-white backdrop-blur-sm">
                <GraduationCap size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase">Учительская</h1>
                <p className="text-emerald-200 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                  Банк заданий и конструктор тестов
                </p>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 bg-white/10 backdrop-blur-sm p-1.5 rounded-[2rem] w-full">
            {[
              { id: 'bank', icon: Database, label: 'Банк заданий (тесты)' },
{ id: 'sections', icon: BookOpen, label: 'Банк заданий (темы)' },
{ id: 'constructor', icon: ClipboardList, label: 'Конструктор' },
              { id: 'students', icon: Users, label: 'Ученики' },
              { id: 'tests_list', icon: BookOpen, label: 'Тесты' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all flex-1 ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-700 shadow-lg scale-[0.98] md:scale-105'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <tab.icon size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 1)}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6">

                {/* ==================== ВКЛАДКА: БАНК ЗАДАНИЙ ПО ТЕМАМ ==================== */}
        {activeTab === 'sections' && (
          <TheoryBank
            tasks={tasks}
            onTaskToggle={toggleTaskSelection}
            selectedTasks={selectedTasks}
            openSolutions={openSolutions}
            openHints={openHints}
            onToggleSolution={(taskId) => setOpenSolutions(prev => ({ ...prev, [taskId]: !prev[taskId] }))}
            onToggleHint={(taskId) => setOpenHints(prev => ({ ...prev, [taskId]: !prev[taskId] }))}
          />
        )}
        
        {/* ==================== ВКЛАДКА: БАНК ЗАДАНИЙ ==================== */}
        {activeTab === 'bank' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Верхняя панель */}
            <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Database size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                    Банк заданий
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {bankClass ? `Раздел ${bankClass}, Тема ${bankTopic || 'выберите тему'}` : 'Выберите раздел и тему'}
                  </p>
                </div>
              </div>
            </div>

            {/* Основной блок */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
              {/* Боковая панель */}
              <aside className="w-full md:w-64 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Filter size={14} /> Раздел
                </h3>
                
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Поиск раздела..."
                    value={bankClassSearch}
                    onChange={(e) => setBankClassSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 py-2.5 pl-9 pr-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto max-h-[40vh] md:max-h-[60vh]">
                  {filteredClasses.length > 0 ? filteredClasses.map(cls => {
                    const count = classTaskCount(cls);
                    const isActive = bankClass === cls;
                    return (
                      <button 
                        key={cls} 
                        onClick={() => { setBankClass(cls); setBankTopic(null); setTaskSearch(''); }}
                        className={`shrink-0 flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                          isActive 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="font-bold text-xs uppercase">{cls}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                          isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>{count}</span>
                      </button>
                    );
                  }) : (
                    <p className="text-[10px] font-bold text-slate-400 text-center py-10 italic">
                      {bankClassSearch ? 'Ничего не найдено' : 'Нет разделов'}
                    </p>
                  )}
                </div>

                {bankClass && groupedTasks[bankClass] && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Темы</h3>
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                      {Object.keys(groupedTasks[bankClass]).sort().map(topic => (
                        <button
                          key={topic}
                          onClick={() => { setBankTopic(topic); setTaskSearch(''); }}
                          className={`p-2 md:p-3 rounded-xl font-black text-[10px] transition-all truncate ${
                            bankTopic === topic ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              {/* Основной контент */}
              <main className="flex-1 p-5 md:p-8 bg-white overflow-y-auto">
                {!bankTopic ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                      <Database size={40} className="text-slate-200" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-slate-300">
                      {bankClass ? 'Выберите тему' : 'Выберите раздел'}
                    </h3>
                    <p className="text-xs font-bold text-slate-300 max-w-xs">
                      {bankClass ? 'Для выбранного раздела доступны темы слева' : 'Слева отображаются разделы с заданиями'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 flex-wrap">
                        <button onClick={() => { setBankClass(null); setBankTopic(null); setBankClassSearch(''); }}>
                          <ChevronRight size={14} className="rotate-180 text-slate-300 hover:text-slate-600" />
                        </button>
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{bankClass}</span>
                        <ChevronRight size={12} />
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">{bankTopic}</span>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Поиск задания..."
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold uppercase outline-none focus:border-emerald-400"
                        />
                        {taskSearch && (
                          <button onClick={() => setTaskSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-black text-slate-400 uppercase">
                      {filteredTasks.length} заданий
                    </div>

                    {filteredTasks.length > 0 ? (
                      <div className="space-y-4">
                        {filteredTasks.map((t, index) => {
                          const isSolOpen = openSolutions[t.id];
                          const isHintOpen = openHints[t.id];
                          const isSelected = selectedTasks.some(st => st.id === t.id);

                          return (
                            <div key={t.id} className={`group p-4 md:p-6 rounded-2xl border transition-all ${
                              isSelected ? 'bg-emerald-50 border-emerald-300 shadow-lg' : 'bg-slate-50 border-transparent hover:border-slate-200'
                            }`}>
                              <div className="space-y-4">
                                {/* Верхняя панель */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                    № {index + 1}
                                  </span>
                                  <span className="text-[9px] text-slate-400">ID: {t.id}</span>
                                  
                                  {t.topic && MAIN_TOPICS[t.topic] && (
                                    <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                                      {MAIN_TOPICS[t.topic]}
                                    </span>
                                  )}
                                  
                                  <div className={`px-2 py-1 rounded-lg border text-[9px] font-black ${getDifficultyColor(t.difficulty)}`}>
                                    LVL {t.difficulty}
                                  </div>
                                  
                                  <span className="text-[9px] text-slate-400">
                                    {t.is_open_answer ? 'Открытый' : 'Тест'}
                                  </span>
                                </div>

                                {/* Условие */}
                                <MarkdownPreview text={t.content} title="Условие" />

                                {/* Варианты ответов */}
                                {!t.is_open_answer && t.options && (
                                  <div className="pl-4 border-l-2 border-emerald-100">
                                    <MarkdownPreview
                                      text={Array.isArray(t.options) 
                                        ? t.options.map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')
                                        : t.options
                                      }
                                      title="Варианты"
                                    />
                                  </div>
                                )}

                                {/* Ответ и кнопки */}
                                <div className="flex flex-wrap gap-2 items-center">
                                  <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl flex items-center gap-2">
                                    <span className="text-[10px] font-black text-emerald-600">Ответ:</span>
                                    <span className="text-sm font-black text-emerald-700">{t.answer}</span>
                                  </div>

                                  {t.hint && (
                                    <button 
                                      onClick={() => setOpenHints(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                                      className="px-3 py-2 rounded-xl bg-amber-50 text-amber-600 text-[10px] font-black"
                                    >
                                      Подсказка
                                    </button>
                                  )}

                                  {t.solution && (
                                    <button 
                                      onClick={() => setOpenSolutions(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                                      className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black"
                                    >
                                      Решение
                                    </button>
                                  )}

                                  {/* Кнопка добавления в тест */}
                                  <button
                                    onClick={() => toggleTaskSelection(t)}
                                    className={`ml-auto px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                                      isSelected 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                                    }`}
                                  >
                                    {isSelected ? '✓ В тесте' : '+ В тест'}
                                  </button>
                                </div>

                                {/* Подсказка и решение */}
                                {isHintOpen && <MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" />}
                                {isSolOpen && <MarkdownPreview text={t.solution} title="РЕШЕНИЕ" type="solution" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-16 space-y-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto">
                          <Search size={32} className="text-slate-200" />
                        </div>
                        <p className="font-black text-slate-400 uppercase">
                          {taskSearch ? 'Ничего не найдено' : 'Нет заданий'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase">
                          {taskSearch ? 'Попробуйте другой запрос' : 'В этой теме пока пусто'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          </div>
        )}

        {/* ==================== ВКЛАДКА: КОНСТРУКТОР ТЕСТОВ ==================== */}
        {activeTab === 'constructor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Форма теста */}
            <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border border-slate-100 h-fit">
              <h2 className="text-xl font-black text-slate-800 uppercase mb-6">
                {testForm.id ? 'Редактировать тест' : 'Новый тест'}
              </h2>

              <form onSubmit={handleTestSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Название</label>
                  <input
                    required
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
                    value={testForm.title}
                    onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                    placeholder="Контрольная работа №1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Раздел</label>
                    <input
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
                      value={testForm.target_class}
                      onChange={e => setTestForm({ ...testForm, target_class: e.target.value })}
                      placeholder="9"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Тема</label>
                    <input
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
                      value={testForm.target_topic}
                      onChange={e => setTestForm({ ...testForm, target_topic: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                

                {/* Выбранные задания */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Задания ({selectedTasks.length})
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {selectedTasks
                      .sort((a, b) => a.id - b.id)
                      .map((task, idx) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                          <span className="font-bold truncate">
                            {idx + 1}. {task.content?.substring(0, 50)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleTaskSelection(task)}
                            className="text-red-400 hover:text-red-600 ml-2"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}
                    {selectedTasks.length === 0 && (
                      <p className="text-xs text-slate-400 italic p-2">Выберите задания во вкладке "Банк заданий"</p>
                    )}
                  </div>
                </div>

                <button className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Send size={18} />
                  {testForm.id ? 'ОБНОВИТЬ ТЕСТ' : 'СОЗДАТЬ ТЕСТ'}
                </button>

                {testForm.id && (
                  <button
                    type="button"
                    onClick={resetTestForm}
                    className="w-full text-slate-400 text-[10px] font-black uppercase hover:text-red-500"
                  >
                    Отменить
                  </button>
                )}
              </form>
            </div>

            {/* Предпросмотр заданий теста */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 uppercase mb-4">Предпросмотр теста</h3>
                {selectedTasks.length === 0 ? (
                  <p className="text-slate-300 italic text-sm">Выберите задания для теста</p>
                ) : (
                  <div className="space-y-6">
                    {selectedTasks
                      .sort((a, b) => {
                        if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
                        return (a.difficulty || 0) - (b.difficulty || 0);
                      })
                      .map((task, idx) => {
                        const isSolOpen = openSolutions[task.id];
                        const isHintOpen = openHints[task.id];

                        return (
                          <div key={task.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-sm font-black text-emerald-600">№{idx + 1}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${getDifficultyColor(task.difficulty)}`}>
                                LVL {task.difficulty}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {task.is_open_answer ? 'Открытый ответ' : 'Выбор варианта'}
                              </span>
                              <span className="text-[9px] text-slate-400 ml-auto">ID: {task.id}</span>
                            </div>

                            <MarkdownPreview text={task.content} title="Условие" />

                            {!task.is_open_answer && task.options && (
                              <div className="mt-4">
                                <MarkdownPreview
                                  title="ВАРИАНТЫ ОТВЕТА"
                                  text={(typeof task.options === 'string'
                                    ? task.options.split(';')
                                    : Array.isArray(task.options) ? task.options : []
                                  )
                                    .map(opt => opt.trim())
                                    .filter(opt => opt.length > 0)
                                    .map((opt, i) => `**${i + 1}.** ${opt}`)
                                    .join('\n\n')}
                                />
                              </div>
                            )}

                            <div className="mt-4 bg-emerald-50/50 border border-emerald-100 px-4 py-3 rounded-2xl flex items-center gap-3">
                              <span className="text-[10px] font-black text-emerald-600 uppercase">Ответ:</span>
                              <span className="text-sm font-black text-emerald-700">{task.answer}</span>
                            </div>

                            <div className="flex gap-2 mt-3">
                              {task.hint && (
                                <button
                                  type="button"
                                  onClick={() => setOpenHints(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                  className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                                    isHintOpen 
                                      ? 'bg-amber-500 text-white border-amber-500' 
                                      : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                                  }`}
                                >
                                  {isHintOpen ? 'Скрыть подсказку' : 'Подсказка'}
                                </button>
                              )}

                              {task.solution && (
                                <button
                                  type="button"
                                  onClick={() => setOpenSolutions(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                  className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                                    isSolOpen 
                                      ? 'bg-blue-600 text-white border-blue-600' 
                                      : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                  }`}
                                >
                                  {isSolOpen ? 'Скрыть решение' : 'Решение'}
                                </button>
                              )}
                            </div>

                            {isHintOpen && (
                              <div className="mt-3 animate-in slide-in-from-top-2 duration-300">
                                <MarkdownPreview text={task.hint} title="ПОДСКАЗКА" type="hint" />
                              </div>
                            )}

                            {isSolOpen && (
                              <div className="mt-3 animate-in slide-in-from-top-2 duration-300">
                                <MarkdownPreview text={task.solution} title="РЕШЕНИЕ" type="solution" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== ВКЛАДКА: УЧЕНИКИ ==================== */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-10 bg-slate-50/50 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic uppercase text-slate-950">Мои ученики</h2>
                <span className="text-[10px] font-black text-white bg-emerald-600 px-4 py-1.5 rounded-full uppercase">
                  {filteredStudents.length} учеников
                </span>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  placeholder="Поиск по имени..."
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="p-4 md:p-8">Ученик</th>
                    <th className="p-4 md:p-8">Контакты</th>
                    <th className="p-4 md:p-8 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-all">
                      <td className="p-4 md:p-8">
                        <div className="font-black text-slate-800 uppercase text-sm">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold">@{student.username}</div>
                      </td>
                      <td className="p-4 md:p-8">
                        {student.tg_username ? (
                          <span className="text-xs text-blue-500 font-bold">{student.tg_username}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4 md:p-8 text-right">
                        <button
                          onClick={() => navigate(`/teacher/students/${student.id}`)}
                          className="p-2 hover:bg-emerald-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== ВКЛАДКА: СПИСОК ТЕСТОВ ==================== */}
        {activeTab === 'tests_list' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 uppercase">Мои тесты</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="text"
                  placeholder="Поиск..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  value={testSearchTerm}
                  onChange={e => setTestSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests
                .filter(t => t.title.toLowerCase().includes(testSearchTerm.toLowerCase()))
                .map(test => (
                  <div key={test.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
                    <h3 className="font-black text-slate-800 mb-2">{test.title}</h3>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {test.target_class && (
                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">
                          {test.target_class}
                        </span>
                      )}
                      {test.target_topic && (
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                          {test.target_topic}
                        </span>
                      )}
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                        {test.tasks?.length || 0} заданий
                      </span>
                    </div>
                    
                    {/* Кнопки действий */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTest(test)}
                        className="flex-1 p-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center gap-1"
                      >
                        <Edit3 size={14} /> Изменить
                      </button>
                      <button
                        onClick={() => setAssignModalTest(test)}
                        className="flex-1 p-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all flex items-center justify-center gap-1"
                      >
                        <UserPlus size={14} /> Назначить
                      </button>
                      <button
                        onClick={() => setAssignmentsModalTest(test)}
                        className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all"
                        title="Список назначений"
                      >
                        <Users size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTest(test.id)}
                        className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {tests.length === 0 && (
              <div className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-widest">
                Нет созданных тестов
              </div>
            )}
          </div>
        )}

      </main>

      {/* Модальные окна */}
      {assignModalTest && (
        <AssignTestModal
          test={assignModalTest}
          students={students}
          onClose={() => setAssignModalTest(null)}
          onAssign={handleAssignTest}
        />
      )}

      {assignmentsModalTest && (
        <TestAssignmentsPanel
          test={assignmentsModalTest}
          onClose={() => setAssignmentsModalTest(null)}
        />
      )}

      {/* Индикатор выбранных заданий (плавающий) */}
      {selectedTasks.length > 0 && activeTab !== 'constructor' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setActiveTab('constructor')}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-2xl hover:bg-emerald-700 transition-all"
          >
            <ClipboardList size={14} />
            Тест: {selectedTasks.length} заданий
          </button>
        </div>
      )}

      {/* Кнопка перехода в банк из конструктора */}
      {activeTab === 'constructor' && (
        <div className="fixed bottom-6 left-6 z-40">
          <button
            onClick={() => setActiveTab('bank')}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-2xl hover:bg-slate-800 transition-all"
          >
            <Database size={14} />
            Банк заданий
          </button>
        </div>
      )}
    </div>
  );
}