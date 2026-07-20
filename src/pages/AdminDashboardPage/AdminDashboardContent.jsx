import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Database, Users, LayoutDashboard, BookOpen, Library, ShieldCheck } from 'lucide-react';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC, INITIAL_TASK_STATE } from './constants';
import { fetchUsers, fetchTasks, fetchAllowedEmails, fetchTheoryList, createTask, updateTask, createTheory, updateTheory, deleteTheory, addAllowedEmail, deleteAllowedEmail, rebuildStaticTests } from './api';
import TaskForm from './TaskForm';
import TaskFormPreview from './TaskFormPreview';
import BankTab from './BankTab';
import TheoryConstructorTab from './TheoryConstructorTab';
import TheoryBankTab from './TheoryBankTab';
import UsersTab from './UsersTab';
import AccessTab from './AccessTab';

export default function AdminDashboardContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollPositions = useRef({});

  // Tab state
  const [activeTab, setActiveTabState] = useState(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab) { localStorage.setItem('admin_tab', urlTab); return urlTab; }
    return localStorage.getItem('admin_tab') || 'create';
  });

  useEffect(() => {
    const handleScroll = () => { scrollPositions.current[activeTab] = window.scrollY; };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      scrollPositions.current[activeTab] = window.scrollY;
      localStorage.setItem('admin_tab', activeTab);
      localStorage.setItem('admin_scroll_positions', JSON.stringify(scrollPositions.current));
    };
  }, [activeTab]);

  useEffect(() => {
    const savedPosition = scrollPositions.current[activeTab] || 0;
    setTimeout(() => window.scrollTo({ top: savedPosition, behavior: 'instant' }), 100);
  }, [activeTab]);

  const setActiveTab = (tabId) => {
    if (tabId === activeTab) return;
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTabState(tabId);
    localStorage.setItem('admin_tab', tabId);
    localStorage.setItem('admin_scroll_positions', JSON.stringify(scrollPositions.current));
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Data
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Task form
  const [taskData, setTaskData] = useState(INITIAL_TASK_STATE);
  const [returnContext, setReturnContext] = useState({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0 });

  // Bank state
  const [bankClass, setBankClass] = useState(null);
  const [bankTopic, setBankTopic] = useState(null);

  // Theory state
  const [theoryList, setTheoryList] = useState([]);
  const [theoryData, setTheoryData] = useState({ id: null, topic: '', section: '', content: '' });
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [usersData, tasksData, emailsData, theoryDataList] = await Promise.all([
          fetchUsers(),
          fetchTasks(),
          fetchAllowedEmails(),
          fetchTheoryList(),
        ]);
        setUsers(usersData);
        setTasks(tasksData);
        setAllowedEmails(emailsData);
        setTheoryList(theoryDataList);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  // Load edit task from session
  useEffect(() => {
    const editTaskId = sessionStorage.getItem('editTaskId');
    if (editTaskId) {
      sessionStorage.removeItem('editTaskId');
      try {
        const task = tasks.find(t => t.id === parseInt(editTaskId));
        if (task) {
          setTaskData({ ...task, options: task.options ? (Array.isArray(task.options) ? task.options.join('; ') : task.options) : '' });
          setActiveTab('create');
        }
      } catch (e) { console.error(e); }
    }
    const savedContext = sessionStorage.getItem('adminReturnContext');
    if (savedContext) {
      setReturnContext(JSON.parse(savedContext));
      sessionStorage.removeItem('adminReturnContext');
    }
  }, [tasks]);

  // Computed
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
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [groupedTasks]);

  const filteredUsers = users.filter(u => {
    const match = (u.first_name + u.last_name + u.username).toLowerCase().includes(userSearch.toLowerCase());
    const role = userRoleFilter === 'all' || u.role === userRoleFilter;
    return match && role;
  });

  const groupedTheory = useMemo(() => {
    return theoryList.reduce((acc, theory) => {
      if (!acc[theory.topic]) acc[theory.topic] = {};
      if (!acc[theory.topic][theory.section]) acc[theory.topic][theory.section] = [];
      acc[theory.topic][theory.section].push(theory);
      return acc;
    }, {});
  }, [theoryList]);

  const filteredTheory = useMemo(() => {
    if (!selectedTopic) return [];
    if (!selectedSection) {
      return Object.keys(groupedTheory[selectedTopic] || {}).map(section => ({
        section,
        theories: groupedTheory[selectedTopic][section],
      }));
    }
    return groupedTheory[selectedTopic]?.[selectedSection] || [];
  }, [groupedTheory, selectedTopic, selectedSection]);

  // Handlers
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const finalTask = {
      ...taskData,
      task_class: String(taskData.task_class),
      topic_number: String(taskData.topic_number),
      options: taskData.is_open_answer ? null : (typeof taskData.options === 'string' ? taskData.options.split(';').map(s => s.trim()) : taskData.options),
    };
    try {
      if (taskData.id) {
        await updateTask(taskData.id, finalTask);
        alert('Задание обновлено!');
        if (returnContext.sourceTab === 'result' && returnContext.resultId) {
          const taskId = taskData.id;
          setReturnContext({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0 });
          setTaskData(INITIAL_TASK_STATE);
          navigate(`/admin/results/${returnContext.resultId}`);
          setTimeout(() => { const el = document.querySelector(`[data-task-id="${taskId}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 500);
          return;
        }
        if (returnContext.sourceTab === 'bank' && returnContext.bankTopic && returnContext.bankClass) {
          setBankClass(returnContext.bankClass);
          setBankTopic(returnContext.bankTopic);
          setActiveTab('bank');
          setTimeout(() => { window.scrollTo({ top: returnContext.scrollPosition, behavior: 'smooth' }); }, 500);
        }
        setReturnContext({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0 });
        setTaskData(INITIAL_TASK_STATE);
      } else {
        await createTask(finalTask);
        alert('Задание создано!');
        setTaskData({ ...INITIAL_TASK_STATE, task_class: taskData.task_class, topic: taskData.topic, section: taskData.section, topic_number: taskData.topic_number, difficulty: taskData.difficulty, is_open_answer: taskData.is_open_answer });
      }
      const tasksData = await fetchTasks();
      setTasks(tasksData);
    } catch (e) { alert('Ошибка при сохранении'); }
  };

  const handleEditTask = (task) => {
    setReturnContext({ sourceTab: 'bank', bankClass, bankTopic, scrollPosition: window.scrollY });
    setTaskData({ ...task, options: task.options ? (Array.isArray(task.options) ? task.options.join('; ') : task.options) : '' });
    setActiveTab('create');
  };

  const handleCancelEdit = () => {
    if (returnContext.sourceTab === 'bank' && returnContext.bankTopic && returnContext.bankClass) {
      setBankClass(returnContext.bankClass);
      setBankTopic(returnContext.bankTopic);
      setActiveTab('bank');
      setTimeout(() => window.scrollTo({ top: returnContext.scrollPosition, behavior: 'smooth' }), 300);
      setReturnContext({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0 });
    }
    setTaskData(INITIAL_TASK_STATE);
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    try {
      const res = await addAllowedEmail(newEmail);
      setAllowedEmails([...allowedEmails, res]);
      setNewEmail('');
    } catch (e) { alert(e.response?.data?.detail || 'Ошибка при добавлении'); }
  };

  const handleDeleteEmail = async (emailString) => {
    if (!confirm(`Удалить ${emailString} из списка?`)) return;
    try {
      await deleteAllowedEmail(emailString);
      setAllowedEmails(prev => prev.filter(e => e.email !== emailString));
    } catch (e) { alert('Ошибка при удалении'); }
  };

  const handleGlobalSync = async () => {
    if (!confirm('Запустить пересборку статики?')) return;
    try {
      await rebuildStaticTests();
      alert('Успех!');
    } catch (err) { alert('Ошибка'); }
  };

  const handleTheorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (theoryData.id) {
        await updateTheory(theoryData.id, { topic: theoryData.topic, section: theoryData.section, content: theoryData.content });
        alert('Теория обновлена!');
      } else {
        await createTheory({ topic: theoryData.topic, section: theoryData.section, content: theoryData.content });
        alert('Теория создана!');
      }
      setTheoryData({ id: null, topic: '', section: '', content: '' });
      const data = await fetchTheoryList();
      setTheoryList(data);
    } catch (e) { alert(e.response?.data?.detail || 'Ошибка при сохранении'); }
  };

  const handleDeleteTheory = async (id) => {
    if (!confirm('Удалить теоретический материал?')) return;
    try {
      await deleteTheory(id);
      const data = await fetchTheoryList();
      setTheoryList(data);
    } catch (e) { alert('Ошибка при удалении'); }
  };

  const handleUsersUpdate = async () => {
    const usersData = await fetchUsers();
    setUsers(usersData);
  };

  const tabs = [
    { id: 'create', icon: PlusCircle, label: 'Создать' },
    { id: 'bank', icon: Database, label: 'Банк' },
    { id: 'theoryConstructor', icon: BookOpen, label: 'Теория+' },
    { id: 'theoryBank', icon: Library, label: 'Библиотека' },
    { id: 'users', icon: Users, label: 'Юзеры' },
    { id: 'access', icon: ShieldCheck, label: 'Доступ' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col gap-6 border-b-4 border-blue-600">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-blue-600 rounded-2xl md:rounded-3xl text-white shadow-lg shadow-blue-500/40">
                <LayoutDashboard size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase">Admin.Core</h1>
                <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Education Engine v5.0</p>
              </div>
            </div>
          </div>
          <nav className="flex gap-1.5 md:gap-2 bg-slate-800 p-1.5 rounded-[2rem] w-full overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all flex-1 min-w-[44px] md:min-w-0 ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg scale-[0.95] md:scale-105' : 'text-slate-400 hover:text-white'
                }`}>
                <tab.icon size={16} className="md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-[10px] md:text-xs whitespace-nowrap">{tab.label.toUpperCase()}</span>
                <span className="sm:hidden text-[10px] font-bold">{tab.label.toUpperCase().slice(0, 1)}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 space-y-10">
        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <TaskForm taskData={taskData} setTaskData={setTaskData} onSubmit={handleTaskSubmit} onCancel={handleCancelEdit} />
            <TaskFormPreview taskData={taskData} />
          </div>
        )}

        {/* Bank Tab */}
        {activeTab === 'bank' && (
          <BankTab
            tasks={tasks}
            groupedTasks={groupedTasks}
            availableClasses={availableClasses}
            bankClass={bankClass}
            setBankClass={setBankClass}
            bankTopic={bankTopic}
            setBankTopic={setBankTopic}
            onEditTask={handleEditTask}
            onTasksUpdate={() => fetchTasks().then(setTasks)}
          />
        )}

        {/* Theory Constructor */}
        {activeTab === 'theoryConstructor' && (
          <TheoryConstructorTab theoryData={theoryData} setTheoryData={setTheoryData} onSubmit={handleTheorySubmit} />
        )}

        {/* Theory Bank */}
        {activeTab === 'theoryBank' && (
          <TheoryBankTab
            groupedTheory={groupedTheory}
            selectedTopic={selectedTopic}
            setSelectedTopic={setSelectedTopic}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            filteredTheory={filteredTheory}
            onEditTheory={(theory) => { setTheoryData(theory); setActiveTab('theoryConstructor'); }}
            onDeleteTheory={handleDeleteTheory}
            onAddNew={() => { setTheoryData({ id: null, topic: selectedTopic, section: selectedSection, content: '' }); setActiveTab('theoryConstructor'); }}
          />
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            filteredUsers={filteredUsers}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userRoleFilter={userRoleFilter}
            setUserRoleFilter={setUserRoleFilter}
            navigate={navigate}
            onUsersUpdate={handleUsersUpdate}
          />
        )}

        {/* Access Tab */}
        {activeTab === 'access' && (
          <AccessTab allowedEmails={allowedEmails} newEmail={newEmail} setNewEmail={setNewEmail} onAddEmail={handleAddEmail} onDeleteEmail={handleDeleteEmail} />
        )}

        {/* Global Sync */}
        <div className="p-8 bg-blue-600 rounded-[3rem] text-white flex justify-between items-center shadow-xl">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Глобальная синхронизация</h3>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Обновить структуру тестов</p>
          </div>
          <button onClick={handleGlobalSync} className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-slate-100 transition-colors shadow-lg">
            Запустить итератор
          </button>
        </div>
      </main>
    </div>
  );
}
