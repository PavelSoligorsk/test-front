import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Database, Users, LayoutDashboard, 
  Search, Send, Eye, UserX, Image as ImageIcon, 
  ChevronRight, Layers, Trash2, Edit3, CheckCircle2,
  ChevronDown, ChevronUp, MailCheck, // добавь в импорт из 'lucide-react'
  ShieldCheck,
  XCircle
} from 'lucide-react';
import 'katex/dist/katex.min.css';

// --- 1. ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---

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
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text || "*Пусто...*"}
      </ReactMarkdown>
    </div>
  </div>
);

// --- 2. ГЛАВНЫЙ КОМПОНЕНТ ---

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('create');
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate(); 
  const [allowedEmails, setAllowedEmails] = useState([]);
const [newEmail, setNewEmail] = useState('');

  // Состояния для раскрывашек
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Состояние формы (ВАЖНО: классы и темы теперь строки)
  const initialTaskState = {
    task_class: '11', 
    topic_number: '1', 
    content: '', 
    answer: '',
    hint: '', 
    solution: '', 
    is_open_answer: true, 
    options: '', 
    difficulty: 1
  };
  const [taskData, setTaskData] = useState(initialTaskState);

  const [bankClass, setBankClass] = useState(null);
  const [bankTopic, setBankTopic] = useState(null);

  

  useEffect(() => {
    fetchUsers();
    fetchTasks();
  }, []);

  // --- API ФУНКЦИИ ---
  const fetchAllowedEmails = async () => {
  try {
    // Достаем токен из localStorage (или где ты его хранишь)
    const session = JSON.parse(localStorage.getItem('edu_session'));
    const token = session?.token; 

    const res = await axios.get('https://tests-production-46d5.up.railway.app/admin/allowed/emails', {
      headers: {
        Authorization: `Bearer ${token}` // Передаем токен авторизации
      }
    });
    setAllowedEmails(res.data);
  } catch (e) {
    console.error("Ошибка авторизации:", e);
  }
};

// Вызови fetchAllowedEmails в useEffect
useEffect(() => {
  fetchUsers();
  fetchTasks();
  fetchAllowedEmails(); // Добавили
}, []);

const handleAddEmail = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post('https://tests-production-46d5.up.railway.app/admin/allowed-emails', { email: newEmail });
    setAllowedEmails([...allowedEmails, res.data]);
    setNewEmail('');
  } catch (e) {
    alert(e.response?.data?.detail || "Ошибка при добавлении");
  }
};

const handleDeleteEmail = async (emailString) => {
  if (!confirm(`Удалить ${emailString} из списка?`)) return;
  try {
    // В URL теперь передаем саму почту
    await axios.delete(`https://tests-production-46d5.up.railway.app/admin/allowed-emails/${emailString}`);
    setAllowedEmails(prev => prev.filter(e => e.email !== emailString));
  } catch (e) { 
    alert("Ошибка при удалении"); 
  }
};

  const fetchUsers = async () => {
    try { const res = await axios.get('https://tests-production-46d5.up.railway.app/admin/users'); setUsers(res.data); } 
    catch (e) { console.error(e); }
  };

  const fetchTasks = async () => {
    try { const res = await axios.get('https://tests-production-46d5.up.railway.app/admin/'); setTasks(res.data); } 
    catch (e) { console.error(e); }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const finalTask = { 
        ...taskData, 
        task_class: String(taskData.task_class),
        topic_number: String(taskData.topic_number),
        options: taskData.is_open_answer ? null : (typeof taskData.options === 'string' ? taskData.options.split(';').map(s => s.trim()) : taskData.options)
    };

    try {
      if (taskData.id) {
        await axios.put(`https://tests-production-46d5.up.railway.app/admin/tasks/${taskData.id}`, finalTask);
        alert("Задание обновлено!");
      } else {
        await axios.post('https://tests-production-46d5.up.railway.app/admin/tasks', finalTask);
        alert("Задание создано!");
      }
      fetchTasks();
      setTaskData(initialTaskState);
    } catch (e) { alert("Ошибка при сохранении"); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(`Удалить задание #${taskId}?`)) return;
    try {
      await axios.delete(`https://tests-production-46d5.up.railway.app/admin/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) { alert("Ошибка при удалении"); }
  };

  const handleChangeRole = async (e, userId, currentRole) => {
    e.stopPropagation();
    const roles = ['student', 'teacher', 'admin'];
    const nextRole = roles[(roles.indexOf(currentRole) + 1) % roles.length];
    try {
      await axios.patch(`https://tests-production-46d5.up.railway.app/admin/users/${userId}/role?new_role=${nextRole}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
    } catch (error) { console.error(error); }
  };

  const handleDeleteUser = async (e, userId) => {
    if (!window.confirm("Удалить пользователя навсегда?")) return;
    e.stopPropagation();
    try {
      await axios.delete(`https://tests-production-46d5.up.railway.app/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) { alert("Ошибка при удалении"); }
  };

  const handleGlobalSync = async () => {
    if (!confirm("Запустить пересборку статики?")) return;
    try {
      await axios.post('https://tests-production-46d5.up.railway.app/admin/rebuild-all-static-tests');
      alert(`Успех!`);
    } catch (err) { alert("Ошибка"); }
  };

  // --- ЛОГИКА ФИЛЬТРАЦИИ ---

  const filteredUsers = users.filter(u => {
    const match = (u.first_name + u.last_name + u.username).toLowerCase().includes(userSearch.toLowerCase());
    const role = userRoleFilter === 'all' || u.role === userRoleFilter;
    return match && role;
  });

  const groupedTasks = useMemo(() => {
    return tasks.reduce((acc, t) => {
      if (!acc[t.task_class]) acc[t.task_class] = {};
      if (!acc[t.task_class][t.topic_number]) acc[t.task_class][t.topic_number] = [];
      acc[t.task_class][t.topic_number].push(t);
      return acc;
    }, {});
  }, [tasks]);

  const availableClasses = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => {
        const numA = parseInt(a); const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });
  }, [groupedTasks]);

  

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-blue-600">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-500/40">
              <LayoutDashboard size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Admin.Core</h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Education Engine v5.0</p>
            </div>
          </div>

          <nav className="flex gap-2 bg-slate-800 p-1.5 rounded-[2rem]">
            {[
              { id: 'create', icon: PlusCircle, label: 'Создать' },
              { id: 'bank', icon: Database, label: 'Банк' },
              { id: 'users', icon: Users, label: 'Юзеры' },
              { id: 'access', icon: ShieldCheck, label: 'Доступ' } // Новая вкладка
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon size={16} /> {tab.label.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6">
        
        {/* ВКЛАДКА: КОНСТРУКТОР */}
        {activeTab === 'create' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-800 uppercase italic">
                    {taskData.id ? `Редактор #${taskData.id}` : 'Конструктор'}
                  </h2>
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button type="button" onClick={() => setTaskData({...taskData, is_open_answer: true})} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${taskData.is_open_answer ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>ОТКРЫТЫЙ</button>
                    <button type="button" onClick={() => setTaskData({...taskData, is_open_answer: false})} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!taskData.is_open_answer ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>ТЕСТ</button>
                  </div>
                </div>
                
                <form onSubmit={handleTaskSubmit} className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Сложность</span>
                      <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setTaskData({...taskData, difficulty: n})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${taskData.difficulty === n ? 'bg-white text-blue-600 shadow-sm scale-110' : 'text-slate-400'}`}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Класс</span>
                      <input type="text" className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold" value={taskData.task_class} onChange={e => setTaskData({...taskData, task_class: e.target.value})}/>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Тема</span>
                      <input type="text" className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold" value={taskData.topic_number} onChange={e => setTaskData({...taskData, topic_number: e.target.value})}/>
                    </label>
                  </div>

                  <textarea required className="w-full p-6 bg-slate-50 border-none rounded-[2rem] h-32 font-mono text-sm" placeholder="Текст задачи..." value={taskData.content} onChange={e => setTaskData({...taskData, content: e.target.value})}/>
                  <textarea className="w-full p-6 bg-emerald-50/30 border-none rounded-[2rem] h-32 font-mono text-sm" placeholder="Решение..." value={taskData.solution} onChange={e => setTaskData({...taskData, solution: e.target.value})}/>

                  {!taskData.is_open_answer && (
                    <input className="w-full p-4 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-2xl font-bold text-sm" placeholder="Вариант А; Вариант Б; Вариант В" value={taskData.options} onChange={e => setTaskData({...taskData, options: e.target.value})}/>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <input required className="w-full p-4 bg-emerald-50 text-emerald-700 border-none rounded-2xl font-black text-center" placeholder="Ответ" value={taskData.answer} onChange={e => setTaskData({...taskData, answer: e.target.value})}/>
                    <input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" placeholder="Hint" value={taskData.hint} onChange={e => setTaskData({...taskData, hint: e.target.value})}/>
                  </div>

                  <button className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3">
                    <Send size={20} /> {taskData.id ? 'ОБНОВИТЬ' : 'ОПУБЛИКОВАТЬ'}
                  </button>
                  
                  {taskData.id && (
                    <button type="button" onClick={() => setTaskData(initialTaskState)} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">Отменить редактирование</button>
                  )}
                </form>
              </div>

              <div className="space-y-6 sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)]">
  {/* Предпросмотр основного текста задачи */}
  <MarkdownPreview text={taskData.content} title={`ПРЕДПРОСМОТР`} />

{/* В правой колонке конструктора */}
{!taskData.is_open_answer && taskData.options && (
  <MarkdownPreview 
    title="ВАРИАНТЫ ОТВЕТА" 
    text={
      (typeof taskData.options === 'string' 
        ? taskData.options.split(';') 
        : Array.isArray(taskData.options) ? taskData.options : []
      )
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0)
      // Используем жирную нумерацию и принудительный перенос строки в конце
      .map((opt, i) => `**${i + 1}.** ${opt}`) 
      .join('\n\n') 
    } 
  />
)}
  {/* Подсказка (Hint) */}
  {taskData.hint && (
    <MarkdownPreview 
      text={`> **Подсказка:** ${taskData.hint}`} 
      title="HINT" 
      type="hint" 
    />
  )}

  {/* Решение */}
  {taskData.solution && (
    <MarkdownPreview 
      text={taskData.solution} 
      title="РЕШЕНИЕ" 
      type="solution" 
    />
  )}
</div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА: БАНК ЗАДАНИЙ */}
        {activeTab === 'bank' && (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex">
            <aside className="w-64 bg-slate-50 border-r border-slate-100 p-8 flex flex-col gap-8">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Классы</h3>
                <div className="flex flex-col gap-2">
                  {availableClasses.map(cls => (
                    <button key={cls} onClick={() => {setBankClass(cls); setBankTopic(null);}} className={`p-4 rounded-2xl text-left font-black text-xs transition-all ${bankClass === cls ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}>
                      {cls} КЛАСС
                    </button>
                  ))}
                </div>
              </div>
              {bankClass && groupedTasks[bankClass] && (
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Темы</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(groupedTasks[bankClass]).sort().map(topic => (
                      <button key={topic} onClick={() => setBankTopic(topic)} className={`p-3 rounded-xl font-black text-[10px] transition-all ${bankTopic === topic ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-500'}`}>
                        № {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            <main className="flex-1 p-10 overflow-y-auto">
              {!bankTopic ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 italic font-black text-xs tracking-widest gap-4">
                  <Database size={48} className="opacity-10" /> Выберите тему
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">Темы №{bankTopic}</h3>
                    <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Найдено: {groupedTasks[bankClass][bankTopic].length}</span>
                  </div>

                  {groupedTasks[bankClass][bankTopic]
  .slice() // Копируем массив для сортировки
  .sort((a, b) => {
    // Сначала тесты (false), потом открытые (true)
    if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
    // Внутри групп — по возрастанию сложности
    return (a.difficulty || 0) - (b.difficulty || 0);
  })
  .map((t, index) => {
    const isSolOpen = openSolutions[t.id];
    const isHintOpen = openHints[t.id];
    
    // Определяем цвет в зависимости от сложности
    const getLvlColor = (lvl) => {
      if (lvl >= 4) return 'text-red-500 bg-red-50 border-red-100';
      if (lvl >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
      return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    };

    return (
      <div key={t.id} className="group p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-2xl transition-all mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">№ {index + 1}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-4">ID: {t.id}</span>
              
              {/* НОВОЕ: Отображение сложности через цифру и цветной индикатор */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border ${getLvlColor(t.difficulty)}`}>
                <span className="text-[9px] font-black uppercase tracking-tight">LVL</span>
                <span className="text-sm font-black italic leading-none">{t.difficulty}</span>
                <div className="flex gap-0.5 ml-1">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div key={step} className={`w-1 h-2 rounded-full ${step <= t.difficulty ? 'bg-current' : 'opacity-20 bg-slate-400'}`} />
                  ))}
                </div>
              </div>

              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                {t.is_open_answer ? '• Открытый ответ' : '• Выбор варианта'}
              </span>
            </div>

            <MarkdownPreview text={t.content} title="Условие задания" type="default" />

            {!t.is_open_answer && t.options && (
              <div className="mt-4 pl-4 border-l-2 border-blue-100 bg-slate-50/50 py-2 rounded-r-xl">
                <MarkdownPreview 
                  type="default"
                  text={(Array.isArray(t.options) ? t.options : t.options.split(';'))
                    .map(opt => opt.trim())
                    .filter(opt => opt !== "")
                    .map((opt, i) => `**${i + 1}.** ${opt}`)
                    .join('\n\n')
                  } 
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-4">
              <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl flex items-center gap-3">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ответ:</span>
                <span className="text-sm font-black text-emerald-700 font-mono">{t.answer}</span>
              </div>
              
              {t.hint && (
                <button onClick={() => setOpenHints(prev => ({...prev, [t.id]: !prev[t.id]}))} className={`px-5 py-3 rounded-2xl border flex items-center gap-2 transition-all ${isHintOpen ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}>
                  <PlusCircle size={14} className={isHintOpen ? 'rotate-0' : 'rotate-45 transition-transform'} />
                  <span className="text-[10px] font-black uppercase">Подсказка</span>
                </button>
              )}
              
              {t.solution && (
                <button onClick={() => setOpenSolutions(prev => ({...prev, [t.id]: !prev[t.id]}))} className={`px-5 py-3 rounded-2xl border flex items-center gap-2 transition-all ${isSolOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>
                  <CheckCircle2 size={14} />
                  <span className="text-[10px] font-black uppercase">Решение</span>
                </button>
              )}
            </div>

            <div className="space-y-3 mt-4">
              {isHintOpen && <div className="animate-in slide-in-from-top-2 duration-300"><MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" /></div>}
              {isSolOpen && <div className="animate-in slide-in-from-top-2 duration-300"><MarkdownPreview text={t.solution} title="ПОЛНОЕ РЕШЕНИЕ" type="solution" /></div>}
            </div>
          </div>

          <div className="flex md:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
            <button 
              className="p-4 bg-white text-slate-400 hover:text-blue-600 rounded-2xl shadow-sm border border-slate-100 active:scale-90 hover:shadow-md transition-all" 
              onClick={() => { 
                setTaskData({...t, options: t.options ? (Array.isArray(t.options) ? t.options.join('; ') : t.options) : ''}); 
                setActiveTab('create'); 
                window.scrollTo(0,0);
              }}
            >
              <Edit3 size={20}/>
            </button>
            <button className="p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 active:scale-90 hover:shadow-md transition-all" onClick={() => handleDeleteTask(t.id)}>
              <Trash2 size={20}/>
            </button>
          </div>
        </div>
      </div>
    );
})}
                </div>
              )}
            </main>
          </div>
        )}

        {/* ВКЛАДКА: ПОЛЬЗОВАТЕЛИ */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-10 bg-slate-50/50 border-b border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic uppercase text-slate-950">Студенты & Состав</h2>
                <span className="text-[10px] font-black text-white bg-blue-600 px-4 py-1.5 rounded-full uppercase">{filteredUsers.length} найдено</span>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="Поиск..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                  {['all', 'admin', 'teacher', 'user'].map(role => (
                    <button key={role} onClick={() => setUserRoleFilter(role)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${userRoleFilter === role ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400'}`}>{role === 'all' ? 'Все' : role}</button>
                  ))}
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-8">Пользователь</th>
                  <th className="p-8">Роль</th>
                  <th className="p-8 text-right">Управление</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => navigate(`/admin/users/${u.id}`)}>
                    <td className="p-8">
                      <div className="font-black text-slate-800 uppercase tracking-tighter text-base group-hover:text-blue-600 transition-colors">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-[10px] text-blue-500 font-bold">@{u.username}</div>
                    </td>
                    <td className="p-8">
                      <button onClick={(e) => handleChangeRole(e, u.id, u.role)} className={`px-4 py-1.5 rounded-full font-black text-[9px] uppercase border transition-all ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : u.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400'}`}>
                        {u.role}
                      </button>
                    </td>
                    <td className="p-8 text-right">
                      <button onClick={(e) => handleDeleteUser(e, u.id)} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <UserX size={20}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ВКЛАДКА: УПРАВЛЕНИЕ ДОСТУПОМ */}
{activeTab === 'access' && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
    
    {/* Форма добавления */}
    <div className="lg:col-span-1 space-y-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-6">Добавить доступ</h2>
        <form onSubmit={handleAddEmail} className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Email адрес</span>
            <input 
              required
              type="email" 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20"
              placeholder="example@mail.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
            />
          </div>
          <button className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3">
            <PlusCircle size={18} /> РАЗРЕШИТЬ
          </button>
        </form>
      </div>
    </div>

    {/* Список разрешенных Email */}
    <div className="lg:col-span-2">
      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Белый список почт</h3>
          <span className="bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
            Всего: {allowedEmails.length}
          </span>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-8">Разрешенный Email</th>
                <th className="p-8 text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {allowedEmails.length === 0 ? (
                <tr>
                  <td colSpan="2" className="p-20 text-center text-slate-300 italic font-black uppercase text-xs tracking-widest">
                    Список пуст
                  </td>
                </tr>
              ) : (
                allowedEmails.map(item => (
                  <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/80 transition-all group">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                          <MailCheck size={18} />
                        </div>
                        <span className="font-bold text-slate-700">{item.email}</span>
                      </div>
                    </td>
                    <td className="p-8 text-right">
                      <button 
                        onClick={() => handleDeleteEmail(item.email)}
                        className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)}

        <div className="mt-10 p-8 bg-blue-600 rounded-[3rem] text-white flex justify-between items-center shadow-xl">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Глобальная синхронизация</h3>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Обновить структуру тестов</p>
          </div>
          <button onClick={handleGlobalSync} className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-slate-100 transition-colors shadow-lg">Запустить итератор</button>
        </div>
      </main>
    </div>
  );
}