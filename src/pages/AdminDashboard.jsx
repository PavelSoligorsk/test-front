import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Database, Users, LayoutDashboard, 
  Search, Send, Eye, UserX, Image as ImageIcon, 
  ChevronRight, Layers, Trash2, Edit3, CheckCircle2,
  ChevronDown, ChevronUp, MailCheck, ShieldCheck, XCircle,
  Upload, Loader2
} from 'lucide-react';
import 'katex/dist/katex.min.css';

// --- КОМПОНЕНТ ПРЕДПРОСМОТРА MARKDOWN ---
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
                    [&_.katex-display]:my-6 [&_.katex-display]:text-center [&_.katex-display]:w-full
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                    [&_th]:border [&_th]:border-slate-300 [&_th]:px-4 [&_th]:py-2 [&_th]:bg-slate-100 [&_th]:font-semibold
                    [&_td]:border [&_td]:border-slate-300 [&_td]:px-4 [&_td]:py-2">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {text || "*Пусто...*"}
      </ReactMarkdown>
    </div>
  </div>
);

const ImageAwareTextarea = ({ value, onChange, placeholder, className = '', rows = 4, required = false }) => {
  const textareaRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const uploadImage = async (file) => {
    setIsUploading(true);
    setUploadProgress(null);
    
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(30);

      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token;

      setUploadProgress(60);

      const response = await fetch('https://tests-production-46d5.up.railway.app/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: base64 }),
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setUploadProgress(100);
      
      return "https://pub-2b7cf8fddd9747b69e66cdac8a86c7fd.r2.dev/" + data.filename;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 500);
    }
  };

  const insertAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertImageMarkdown = (imageUrl, fileName) => {
    const imageMarkdown = `![${fileName || 'изображение'}](${imageUrl})`;
    insertAtCursor(imageMarkdown);
  };

  // ✅ Исправленный handlePaste — без временной метки
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;
        
        const imageUrl = await uploadImage(file);
        
        if (imageUrl) {
          insertImageMarkdown(imageUrl, file.name || 'image');
        } else {
          insertAtCursor('❌ Ошибка загрузки изображения');
        }
        break;
      }
    }
  };

  // ✅ Исправленный handleFileSelect
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    const imageUrl = await uploadImage(file);
    
    if (imageUrl) {
      insertImageMarkdown(imageUrl, file.name);
    } else {
      insertAtCursor('❌ Ошибка загрузки изображения');
    }
    
    e.target.value = '';
  };

  // ✅ Исправленный handleDrop
  const handleDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const imageUrl = await uploadImage(file);
        
        if (imageUrl) {
          insertImageMarkdown(imageUrl, file.name);
        } else {
          insertAtCursor('❌ Ошибка загрузки изображения');
        }
        break;
      }
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        placeholder={placeholder}
        className={className}
        rows={rows}
        required={required}
      />
      
      <div className="absolute bottom-2 right-2 flex gap-1">
        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-lg p-1.5 transition-colors">
          <Upload size={14} className="text-slate-500" />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>
      
      {isUploading && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md animate-pulse flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          {uploadProgress ? `${uploadProgress}%` : 'Загрузка...'}
        </div>
      )}
      
    
    </div>
  );
};

// --- ОСНОВНОЙ КОМПОНЕНТ АДМИНКИ ---
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('create');
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [bankClass, setBankClass] = useState(null);
  const [bankTopic, setBankTopic] = useState(null);

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

  useEffect(() => {
    fetchUsers();
    fetchTasks();
    fetchAllowedEmails();
  }, []);

  const fetchAllowedEmails = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token;
      const res = await axios.get('https://tests-production-46d5.up.railway.app/admin/allowed/emails', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllowedEmails(res.data);
    } catch (e) {
      console.error("Ошибка:", e);
    }
  };

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
      await axios.delete(`https://tests-production-46d5.up.railway.app/admin/allowed-emails/${emailString}`);
      setAllowedEmails(prev => prev.filter(e => e.email !== emailString));
    } catch (e) {
      alert("Ошибка при удалении");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('https://tests-production-46d5.up.railway.app/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get('https://tests-production-46d5.up.railway.app/admin/');
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
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
        if (taskData.id) {
  await axios.put(`https://tests-production-46d5.up.railway.app/admin/tasks/${taskData.id}`, finalTask);
  alert("Задание обновлено!");
  
  // Возвращаемся в банк заданий после обновления
  if (returnContext.bankClass && returnContext.bankTopic) {
    setBankClass(returnContext.bankClass);
    setBankTopic(returnContext.bankTopic);
    setActiveTab('bank');
    
    setTimeout(() => {
      window.scrollTo(0, returnContext.scrollPosition);
    }, 100);
    
    setReturnContext({ bankClass: null, bankTopic: null, scrollPosition: 0 });
    setTaskData(initialTaskState);
  }
} else {
  await axios.post('https://tests-production-46d5.up.railway.app/admin/tasks', finalTask);
  alert("Задание создано!");
  setTaskData(initialTaskState);
}
      } else {
        await axios.post('https://tests-production-46d5.up.railway.app/admin/tasks', finalTask);
        alert("Задание создано!");
      }
      fetchTasks();
      setTaskData(initialTaskState);
    } catch (e) {
      alert("Ошибка при сохранении");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(`Удалить задание #${taskId}?`)) return;
    try {
      await axios.delete(`https://tests-production-46d5.up.railway.app/admin/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      alert("Ошибка при удалении");
    }
  };

  const handleChangeRole = async (e, userId, currentRole) => {
    e.stopPropagation();
    const roles = ['student', 'teacher', 'admin'];
    const nextRole = roles[(roles.indexOf(currentRole) + 1) % roles.length];
    try {
      await axios.patch(`https://tests-production-46d5.up.railway.app/admin/users/${userId}/role?new_role=${nextRole}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: nextRole } : u));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (e, userId) => {
    if (!window.confirm("Удалить пользователя навсегда?")) return;
    e.stopPropagation();
    try {
      await axios.delete(`https://tests-production-46d5.up.railway.app/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      alert("Ошибка при удалении");
    }
  };

  const handleGlobalSync = async () => {
    if (!confirm("Запустить пересборку статики?")) return;
    try {
      await axios.post('https://tests-production-46d5.up.railway.app/admin/rebuild-all-static-tests');
      alert("Успех!");
    } catch (err) {
      alert("Ошибка");
    }
  };

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
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [groupedTasks]);

  const getDifficultyColor = (lvl) => {
    if (lvl >= 4) return 'text-red-500 bg-red-50 border-red-100';
    if (lvl >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  const [returnContext, setReturnContext] = useState({
  bankClass: null,
  bankTopic: null,
  scrollPosition: 0
});

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
                <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">
                  Education Engine v5.0
                </p>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 bg-slate-800 p-1.5 rounded-[2rem] w-full">
            {[
              { id: 'create', icon: PlusCircle, label: 'Создать' },
              { id: 'bank', icon: Database, label: 'Банк' },
              { id: 'users', icon: Users, label: 'Юзеры' },
              { id: 'access', icon: ShieldCheck, label: 'Доступ' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-0 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all flex-1 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg scale-[0.98] md:scale-105'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label.toUpperCase()}</span>
                <span className="sm:hidden">{tab.label.toUpperCase().slice(0, 1)}</span>
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
                  <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 sm:gap-2">
  <button
    type="button"
    onClick={() => setTaskData({ ...taskData, is_open_answer: true })}
    className={`
      flex-1 sm:flex-none
      px-2 sm:px-3 md:px-4
      py-1.5 sm:py-2
      rounded-xl
      text-[8px] sm:text-[10px] md:text-xs
      font-black
      transition-all
      whitespace-nowrap
      ${taskData.is_open_answer 
        ? 'bg-white text-blue-600 shadow-sm' 
        : 'text-slate-400 hover:text-slate-600'
      }
    `}
  >
    ОТКРЫТЫЙ
  </button>
  <button
    type="button"
    onClick={() => setTaskData({ ...taskData, is_open_answer: false })}
    className={`
      flex-1 sm:flex-none
      px-2 sm:px-3 md:px-4
      py-1.5 sm:py-2
      rounded-xl
      text-[8px] sm:text-[10px] md:text-xs
      font-black
      transition-all
      whitespace-nowrap
      ${!taskData.is_open_answer 
        ? 'bg-white text-blue-600 shadow-sm' 
        : 'text-slate-400 hover:text-slate-600'
      }
    `}
  >
    ТЕСТ
  </button>
</div>
                </div>

                <form onSubmit={handleTaskSubmit} className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Сложность</span>
                      <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTaskData({ ...taskData, difficulty: n })}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${taskData.difficulty === n ? 'bg-white text-blue-600 shadow-sm scale-110' : 'text-slate-400'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Класс</span>
                      <input
                        type="text"
                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold"
                        value={taskData.task_class}
                        onChange={e => setTaskData({ ...taskData, task_class: e.target.value })}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Тема</span>
                      <input
                        type="text"
                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold"
                        value={taskData.topic_number}
                        onChange={e => setTaskData({ ...taskData, topic_number: e.target.value })}
                      />
                    </label>
                  </div>

                  <ImageAwareTextarea
                    required
                    value={taskData.content}
                    onChange={(value) => setTaskData({ ...taskData, content: value })}
                    placeholder="Текст задачи (можно вставить изображение)..."
                    className="w-full p-6 bg-slate-50 border-none rounded-[2rem] min-h-[120px] font-mono text-sm resize-y"
                    rows={4}
                  />

                  <ImageAwareTextarea
                    value={taskData.solution}
                    onChange={(value) => setTaskData({ ...taskData, solution: value })}
                    placeholder="Решение (можно вставить изображение)..."
                    className="w-full p-6 bg-emerald-50/30 border-none rounded-[2rem] min-h-[100px] font-mono text-sm resize-y"
                    rows={3}
                  />

                  {!taskData.is_open_answer && (
                    <ImageAwareTextarea
  value={taskData.options}
  onChange={(value) => setTaskData({ ...taskData, options: value })}
  placeholder="Вариант А; Вариант Б; Вариант В (можно вставить изображение)..."
  className="w-full p-4 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-2xl font-bold text-sm min-h-[80px] resize-y"
  rows={2}
/>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      required
                      className="w-full p-4 bg-emerald-50 text-emerald-700 border-none rounded-2xl font-black text-center"
                      placeholder="Ответ"
                      value={taskData.answer}
                      onChange={e => setTaskData({ ...taskData, answer: e.target.value })}
                    />
                    <ImageAwareTextarea
                      value={taskData.hint}
                      onChange={(value) => setTaskData({ ...taskData, hint: value })}
                      placeholder="Подсказка (можно вставить изображение)..."
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm resize-y"
                      rows={2}
                    />
                  </div>

                  <button className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3">
                    <Send size={20} /> {taskData.id ? 'ОБНОВИТЬ' : 'ОПУБЛИКОВАТЬ'}
                  </button>

                  {taskData.id && (
  <button
    type="button"
    onClick={() => {
      if (returnContext.bankClass && returnContext.bankTopic) {
        // Возвращаемся в банк
        setBankClass(returnContext.bankClass);
        setBankTopic(returnContext.bankTopic);
        setActiveTab('bank');
        
        setTimeout(() => {
          window.scrollTo(0, returnContext.scrollPosition);
        }, 100);
        
        setReturnContext({ bankClass: null, bankTopic: null, scrollPosition: 0 });
        setTaskData(initialTaskState);
      } else {
        setTaskData(initialTaskState);
      }
    }}
    className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors"
  >
    {returnContext.bankTopic ? '← Отменить и вернуться в банк' : 'Отменить редактирование'}
  </button>
)}
                </form>
              </div>

              <div className="space-y-6 sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)]">
                <MarkdownPreview text={taskData.content} title="ПРЕДПРОСМОТР" />

                {!taskData.is_open_answer && taskData.options && (
                  <MarkdownPreview
                    title="ВАРИАНТЫ ОТВЕТА"
                    text={(typeof taskData.options === 'string'
                      ? taskData.options.split(';')
                      : Array.isArray(taskData.options) ? taskData.options : []
                    )
                      .map(opt => opt.trim())
                      .filter(opt => opt.length > 0)
                      .map((opt, i) => `**${i + 1}.** ${opt}`)
                      .join('\n\n')}
                  />
                )}

                {taskData.hint && (
                  <MarkdownPreview text={`> **Подсказка:** ${taskData.hint}`} title="HINT" type="hint" />
                )}

                {taskData.solution && (
                  <MarkdownPreview text={taskData.solution} title="РЕШЕНИЕ" type="solution" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА: БАНК ЗАДАНИЙ */}
{activeTab === 'bank' && (
  <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
    {/* Боковая панель - на телефоне сверху, на компах слева */}
    <aside className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-8 flex flex-col gap-6 md:gap-8">
      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 italic">Раздел</h3>
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {availableClasses.map(cls => (
            <button
              key={cls}
              onClick={() => { setBankClass(cls); setBankTopic(null); }}
              className={`shrink-0 md:shrink p-3 md:p-4 rounded-2xl text-left font-black text-xs transition-all ${bankClass === cls ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>
      
      {bankClass && groupedTasks[bankClass] && (
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 italic">Темы или Варианты</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
            {Object.keys(groupedTasks[bankClass]).sort().map(topic => (
              <button
                key={topic}
                onClick={() => setBankTopic(topic)}
                className={`p-2 md:p-3 rounded-xl font-black text-[10px] transition-all truncate ${bankTopic === topic ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-500'}`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>

    {/* Основной контент */}
    <main className="flex-1 p-4 md:p-10 overflow-y-auto">
      {!bankTopic ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-300 italic font-black text-xs tracking-widest gap-4 py-20 md:py-0">
          <Database size={48} className="opacity-10" /> Выберите тему
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-8 border-b border-slate-50 pb-4 md:pb-6">
            <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic break-words">{bankTopic}</h3>
            <span className="bg-slate-100 text-slate-500 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap">
              Найдено: {groupedTasks[bankClass][bankTopic].length}
            </span>
          </div>

          {groupedTasks[bankClass][bankTopic]
            .slice()
            .sort((a, b) => {
              if (a.id !== b.id) return a.id - b.id;
              return (a.difficulty || 0) - (b.difficulty || 0);
            })
            .sort((a, b) => {
              if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
              return (a.difficulty || 0) - (b.difficulty || 0);
            })
            .map((t, index) => {
              const isSolOpen = openSolutions[t.id];
              const isHintOpen = openHints[t.id];

              return (
                <div key={t.id} className="group p-4 md:p-8 bg-slate-50 rounded-2xl md:rounded-[2.5rem] border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-2xl transition-all mb-4 md:mb-6">
                  <div className="flex flex-col gap-6 md:gap-8">
                    {/* Левая часть с контентом */}
                    <div className="flex-1 space-y-4 w-full">
                      {/* Верхняя информационная панель */}
                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 md:px-3 py-1 rounded-lg">№ {index + 1}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2 md:pl-4">ID: {t.id}</span>
                        <div className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-xl border ${getDifficultyColor(t.difficulty)}`}>
                          <span className="text-[9px] font-black uppercase tracking-tight">LVL</span>
                          <span className="text-sm font-black italic leading-none">{t.difficulty}</span>
                          <div className="hidden sm:flex gap-0.5 ml-1">
                            {[1, 2, 3, 4, 5].map(step => (
                              <div key={step} className={`w-1 h-2 rounded-full ${step <= t.difficulty ? 'bg-current' : 'opacity-20 bg-slate-400'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                          {t.is_open_answer ? '• Открытый ответ' : '• Выбор варианта'}
                        </span>
                      </div>

                      {/* Условие задания */}
                      <MarkdownPreview text={t.content} title="Условие задания" type="default" />

                      {/* Варианты ответов для тестов */}
                      {!t.is_open_answer && t.options && (
                        <div className="mt-4 pl-2 md:pl-4 border-l-2 border-blue-100 bg-slate-50/50 py-2 rounded-r-xl">
                          <MarkdownPreview
                            type="default"
                            text={(Array.isArray(t.options) ? t.options : t.options.split(';'))
                              .map(opt => opt.trim())
                              .filter(opt => opt !== "")
                              .map((opt, i) => `**${i + 1}.** ${opt}`)
                              .join('\n\n')}
                          />
                        </div>
                      )}

                      {/* Блок с ответом и кнопками */}
                      <div className="flex flex-wrap gap-2 md:gap-3 mt-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-3 md:px-5 py-2 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ответ:</span>
                          <span className="text-xs md:text-sm font-black text-emerald-700 font-mono break-all">{t.answer}</span>
                        </div>

                        {t.hint && (
                          <button onClick={() => setOpenHints(prev => ({ ...prev, [t.id]: !prev[t.id] }))} 
                            className={`px-3 md:px-5 py-2 md:py-3 rounded-2xl border flex items-center gap-1 md:gap-2 transition-all ${isHintOpen ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}>
                            <PlusCircle size={12} className="md:w-[14px] md:h-[14px]" className={isHintOpen ? 'rotate-0' : 'rotate-45 transition-transform'} />
                            <span className="text-[10px] font-black uppercase">Подсказка</span>
                          </button>
                        )}

                        {t.solution && (
                          <button onClick={() => setOpenSolutions(prev => ({ ...prev, [t.id]: !prev[t.id] }))} 
                            className={`px-3 md:px-5 py-2 md:py-3 rounded-2xl border flex items-center gap-1 md:gap-2 transition-all ${isSolOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>
                            <CheckCircle2 size={12} className="md:w-[14px] md:h-[14px]" />
                            <span className="text-[10px] font-black uppercase">Решение</span>
                          </button>
                        )}
                      </div>

                      {/* Подсказка и решение */}
                      <div className="space-y-3 mt-4">
                        {isHintOpen && <div className="animate-in slide-in-from-top-2 duration-300"><MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" /></div>}
                        {isSolOpen && <div className="animate-in slide-in-from-top-2 duration-300"><MarkdownPreview text={t.solution} title="ПОЛНОЕ РЕШЕНИЕ" type="solution" /></div>}
                      </div>
                    </div>

                    {/* Кнопки действий - на телефоне снизу, на десктопе справа */}
                    <div className="flex flex-row md:flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0 justify-end md:justify-start">
                      <button
  className="flex-1 md:flex-none p-3 md:p-4 bg-white text-slate-400 hover:text-blue-600 rounded-2xl shadow-sm border border-slate-100 active:scale-90 hover:shadow-md transition-all"
  onClick={() => {
  // Сохраняем контекст перед переходом
  setReturnContext({
    bankClass: bankClass,
    bankTopic: bankTopic,
    scrollPosition: window.scrollY
  });
  
  // Загружаем задание в редактор
  setTaskData({ 
    ...t, 
    options: t.options ? (Array.isArray(t.options) ? t.options.join('; ') : t.options) : '' 
  });
  
  // Переключаемся на вкладку конструктора
  setActiveTab('create');
}}
>
  <Edit3 size={18} className="md:w-5 md:h-5" />
</button>
                      <button 
                        className="flex-1 md:flex-none p-3 md:p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 active:scale-90 hover:shadow-md transition-all" 
                        onClick={() => handleDeleteTask(t.id)}
                      >
                        <Trash2 size={18} className="md:w-5 md:h-5" />
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
                        <UserX size={20} />
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
          <button onClick={handleGlobalSync} className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-slate-100 transition-colors shadow-lg">
            Запустить итератор
          </button>
        </div>
      </main>
    </div>
  );
}