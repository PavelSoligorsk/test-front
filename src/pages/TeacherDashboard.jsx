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
  ChevronLeft, ArrowRight, Calendar, Trophy, Target
} from 'lucide-react';
import 'katex/dist/katex.min.css';

// ==================== КОНСТАНТЫ (такие же как в админке) ====================
const MAIN_TOPICS = {
  'numbers': 'Числа и вычисления',
  'expressions': 'Выражения и их преобразования',
  'equations': 'Уравнения и неравенства',
  'functions': 'Координаты и функции',
  'geometry': 'Геометрия'
};

const API_BASE = 'https://tests-production-46d5.up.railway.app';

// ==================== КОМПОНЕНТ ПРЕДПРОСМОТРА ====================
const MarkdownPreview = ({ text, title, type }) => (
  <div className={`p-6 rounded-[2rem] border shadow-sm ${
    type === 'hint' ? 'bg-amber-50/40 border-amber-100' : 
    type === 'solution' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-slate-200'
  }`}>
    <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${
      type === 'hint' ? 'text-amber-500' : type === 'solution' ? 'text-emerald-500' : 'text-slate-400'
    }`}>{title}</h4>
    
    <div className="prose prose-slate max-w-none text-sm text-slate-800 text-left
                    [&_img]:rounded-2xl [&_img]:shadow-xl [&_img]:my-6 [&_img]:block [&_img]:max-h-64
                    [&_.katex-display]:my-6 [&_.katex-display]:text-center [&_.katex-display]:w-full">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {text || "*Пусто...*"}
      </ReactMarkdown>
    </div>
  </div>
);

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
    const token = session?.token || session?.access_token; // Проверяем оба варианта
    
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
              { id: 'bank', icon: Database, label: 'Банк заданий' },
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
        
        {/* ==================== ВКЛАДКА: БАНК ЗАДАНИЙ ==================== */}
        {activeTab === 'bank' && (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
            {/* Боковая панель */}
            <aside className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-8 flex flex-col gap-6">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Класс</h3>
                <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2">
                  {availableClasses.map(cls => (
                    <button
                      key={cls}
                      onClick={() => { setBankClass(cls); setBankTopic(null); }}
                      className={`shrink-0 p-3 rounded-2xl text-left font-black text-xs transition-all ${
                        bankClass === cls ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border'
                      }`}
                    >
                      {cls} класс
                    </button>
                  ))}
                </div>
              </div>
              
              {bankClass && groupedTasks[bankClass] && (
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Темы</h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                    {Object.keys(groupedTasks[bankClass]).sort().map(topic => (
                      <button
                        key={topic}
                        onClick={() => setBankTopic(topic)}
                        className={`p-2 md:p-3 rounded-xl font-black text-[10px] transition-all truncate ${
                          bankTopic === topic ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-500'
                        }`}
                      >
                        Тема {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Основной контент банка */}
            <main className="flex-1 p-4 md:p-10 overflow-y-auto">
              {!bankTopic ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 font-black text-xs tracking-widest gap-4 py-20">
                  <Database size={48} className="opacity-10" />
                  Выберите класс и тему
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-black text-slate-800 uppercase">
                      Класс {bankClass}, Тема {bankTopic}
                    </h3>
                    <span className="bg-slate-100 px-4 py-1.5 rounded-xl text-[10px] font-black">
                      {groupedTasks[bankClass][bankTopic].length} заданий
                    </span>
                  </div>

                  {groupedTasks[bankClass][bankTopic]
                        .sort((a, b) => {
        // 1. Сначала сортируем по ID (по возрастанию)
        if (a.id !== b.id) return a.id - b.id;
        // 2. Потом открытые/закрытые
        if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
        // 3. Потом по сложности
        return (a.difficulty || 0) - (b.difficulty || 0);
    })
                    .map((t, index) => {
                      const isSolOpen = openSolutions[t.id];
                      const isHintOpen = openHints[t.id];
                      const isSelected = selectedTasks.some(st => st.id === t.id);

                      return (
                        <div key={t.id} className={`group p-4 md:p-6 rounded-2xl border transition-all mb-4 ${
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
                              {activeTab === 'bank' && (
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
                              )}
                            </div>

                            {/* Подсказка и решение */}
                            {isHintOpen && <MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" />}
                            {isSolOpen && <MarkdownPreview text={t.solution} title="РЕШЕНИЕ" type="solution" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </main>
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
            <label className="text-[10px] font-black text-slate-400 uppercase">Класс</label>
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

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <input
            type="checkbox"
            checked={testForm.is_autocompile}
            onChange={e => setTestForm({ ...testForm, is_autocompile: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-[10px] font-black text-slate-600 uppercase">Автосборка</span>
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
                    {/* Заголовок задания */}
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

                    {/* Условие задачи */}
                    <MarkdownPreview text={task.content} title="Условие" />

                    {/* Варианты ответов для тестов */}
                    {/* Варианты ответов для тестов */}
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

                    {/* Ответ */}
                    <div className="mt-4 bg-emerald-50/50 border border-emerald-100 px-4 py-3 rounded-2xl flex items-center gap-3">
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Ответ:</span>
                      <span className="text-sm font-black text-emerald-700">{task.answer}</span>
                    </div>

                    {/* Кнопки подсказки и решения */}
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

                    {/* Подсказка */}
                    {isHintOpen && (
                      <div className="mt-3 animate-in slide-in-from-top-2 duration-300">
                        <MarkdownPreview text={task.hint} title="ПОДСКАЗКА" type="hint" />
                      </div>
                    )}

                    {/* Решение */}
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
                    <tr key={student.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/teacher/students/${student.id}`)}>
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
                        <ArrowRight size={18} className="inline text-slate-300 group-hover:text-emerald-600" />
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
                    <div className="flex gap-2 mb-3">
                      {test.target_class && (
                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">
                          {test.target_class} класс
                        </span>
                      )}
                      {test.target_topic && (
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                          Тема {test.target_topic}
                        </span>
                      )}
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                        {test.tasks?.length || 0} заданий
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTest(test)}
                        className="flex-1 p-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                      >
                        <Edit3 size={14} className="inline mr-1" /> Изменить
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

      {/* Индикатор выбранных заданий (плавающий) */}
      {selectedTasks.length > 0 && activeTab !== 'constructor' && (
        <div className="fixed bottom-6 right-6 z-50">
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
        <div className="fixed bottom-6 left-6 z-50">
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