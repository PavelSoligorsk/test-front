import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Star, 
  Clock, 
  ArrowRight, 
  LogOut, 
  LayoutGrid, 
  History,
  GraduationCap,
  Search,
  Calendar,
  User as UserIcon,
  Phone,
  Check,
  Sparkles,
  Users,
  Bot,
  Zap,
  Target,
  RefreshCw,
  AlertCircle,
  XCircle,
  Filter,
  ChevronRight,
  BarChart3 ,
  Trophy ,
  Hash, Library, BookOpen as BookIcon
} from 'lucide-react';
import axios from 'axios';
import { TheoryViewer } from '../components/Theory'; // путь к вашему TheoryViewer
import TheoryAIChat from '../components/TheoryAIChat';

// ==================== КОМПОНЕНТ: КАРТОЧКА ТЕСТА ====================
const TestCard = ({ test, type, onStart, disabled }) => {
  const getTypeStyles = () => {
    switch(type) {
      case 'static':
        return {
          gradient: 'from-blue-600 to-blue-700',
          icon: BookOpen,
          label: 'АВТОСБОРКА',
          badge: 'bg-blue-100 text-blue-600',
          accent: 'blue',
          accentBg: 'bg-blue-50'
        };
      case 'custom':
        return {
          gradient: 'from-emerald-600 to-teal-700',
          icon: Users,
          label: 'ОТ УЧИТЕЛЯ',
          badge: 'bg-emerald-100 text-emerald-600',
          accent: 'emerald',
          accentBg: 'bg-emerald-50'
        };
      case 'ai':
        return {
          gradient: 'from-purple-600 to-violet-700',
          icon: Bot,
          label: 'AI ГЕНЕРАЦИЯ',
          badge: 'bg-purple-100 text-purple-600',
          accent: 'purple',
          accentBg: 'bg-purple-50'
        };
      default:
        return {
          gradient: 'from-slate-600 to-slate-700',
          icon: BookOpen,
          label: 'ТЕСТ',
          badge: 'bg-slate-100 text-slate-600',
          accent: 'slate',
          accentBg: 'bg-slate-50'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div 
      onClick={() => !disabled && onStart && onStart(test)}
      className={`group relative bg-white rounded-[2rem] border-2 transition-all overflow-hidden ${
        disabled 
          ? 'border-slate-100 opacity-60 cursor-not-allowed' 
          : 'border-slate-100 hover:border-' + styles.accent + '-400 hover:shadow-2xl cursor-pointer hover:-translate-y-1'
      }`}
    >
      {/* Верхняя цветная полоса */}
      <div className={`h-1.5 bg-gradient-to-r ${styles.gradient}`} />
      
      <div className="p-5 md:p-6">
        {/* Заголовок и тип */}
        <div className="flex justify-between items-start mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${styles.gradient} rounded-xl flex items-center justify-center text-white shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform`}>
            <Icon size={18} />
          </div>
          <span className={`text-[7px] font-black uppercase px-2 py-1 rounded-lg ${styles.badge} tracking-wider`}>
            {styles.label}
          </span>
        </div>
        
        {/* Название теста */}
        <div className="space-y-1 mb-4">
          <h3 className="text-base font-black text-slate-900 uppercase leading-tight line-clamp-2">
            {test.title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim() || 'Без названия'}
          </h3>
          {test.subject && (
            <p className="text-[9px] font-bold text-slate-400 uppercase">
              {test.subject}
            </p>
          )}
        </div>
        
        {/* Статистика */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className={`flex items-center gap-1.5 ${styles.accentBg} px-2.5 py-1.5 rounded-lg`}>
            <LayoutGrid size={12} className={`text-${styles.accent}-600`} /> 
            <span className="text-[9px] font-black uppercase text-slate-600">
              {test.tasks?.length || 0} задач
            </span>
          </div>
          {test.duration && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
              <Clock size={12} className="text-slate-400" />
              <span className="text-[9px] font-black uppercase text-slate-500">
                {test.duration} мин
              </span>
            </div>
          )}
          {test.difficulty && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
              <Target size={12} className={`text-${styles.accent}-600`} />
              <span className="text-[9px] font-black uppercase text-slate-500">
                Ур. {test.difficulty}
              </span>
            </div>
          )}
        </div>

        {/* Дедлайн для назначенных тестов */}
        {test.due_date && !test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
            <AlertCircle size={12} className="text-amber-500" />
            <span className="text-[9px] font-black text-amber-700 uppercase">
              До {new Date(test.due_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Статус выполнения */}
        {test.is_completed && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
            <Check size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-700 uppercase">
              Выполнено
            </span>
          </div>
        )}

        {/* Кнопка действия */}
        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-${styles.accent}-600 group-hover:tracking-[0.25em] transition-all`}>
            {disabled ? 'Недоступно' : test.started ? 'Продолжить' : 'Начать'}
          </span>
          <ArrowRight size={14} className={`text-${styles.accent}-600 transform group-hover:translate-x-2 transition-transform`} />
        </div>
      </div>
    </div>
  );
};

// ==================== КОМПОНЕНТ: КАРТОЧКА ТЕМЫ ====================
const TopicCard = ({ topic, onClick }) => {
  const getTopicStyles = (topicKey) => {
    const styles = {
      'numbers': { gradient: 'from-orange-500 to-red-500', icon: '🔢', label: 'Числа и вычисления' },
      'expressions': { gradient: 'from-purple-500 to-pink-500', icon: '📝', label: 'Выражения' },
      'equations': { gradient: 'from-blue-500 to-cyan-500', icon: '⚖️', label: 'Уравнения' },
      'functions': { gradient: 'from-emerald-500 to-teal-500', icon: '📈', label: 'Функции' },
      'geometry': { gradient: 'from-rose-500 to-orange-500', icon: '📐', label: 'Геометрия' },
      // НОВЫЕ ТЕМЫ:
      'planim': { gradient: 'from-green-500 to-lime-500', icon: '📏', label: 'Планиметрия' },
      'stereo': { gradient: 'from-indigo-500 to-violet-500', icon: '🧊', label: 'Стереометрия' },
      'inequalities': { gradient: 'from-yellow-500 to-amber-500', icon: '≷', label: 'Неравенства' },
      'text': { gradient: 'from-sky-500 to-blue-500', icon: '📖', label: 'Текстовые задачи' }
    };
    return styles[topicKey] || { gradient: 'from-slate-500 to-slate-600', icon: '📚', label: topic.label };
  };

  const styles = getTopicStyles(topic.topic);

  return (
    <button
      onClick={() => onClick(topic)}
      className="group relative bg-white rounded-[2rem] border-2 border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all overflow-hidden text-left w-full"
    >
      <div className={`h-1.5 bg-gradient-to-r ${styles.gradient}`} />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${styles.gradient} rounded-xl flex items-center justify-center text-white shadow-lg text-2xl`}>
            {styles.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-800 text-sm uppercase">
              {styles.label}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              {topic.sections_count} разделов
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span className="text-[9px] font-black uppercase text-slate-400">Изучить</span>
          <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
export default function StudentDashboard() {
  const navigate = useNavigate();
  
  // Состояния
  const [staticTests, setStaticTests] = useState([]);
  const [customTests, setCustomTests] = useState([]);
  const [aiTests, setAiTests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests');
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  // После существующих состояний
const [theoryTopics, setTheoryTopics] = useState([]);
const [selectedTopic, setSelectedTopic] = useState(null);
const [selectedSection, setSelectedSection] = useState(null);
const [theoryContent, setTheoryContent] = useState(null);
const [theoryLoading, setTheoryLoading] = useState(false);
const [showSectionModal, setShowSectionModal] = useState(false);
const [sectionsForModal, setSectionsForModal] = useState([]);
  
  // Иерархия: класс → тема
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('Все');
  const [classSearch, setClassSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  
  // Профиль
  const [searchTerm, setSearchTerm] = useState('');
  const [editForm, setEditForm] = useState({ 
    first_name: '', 
    last_name: '', 
    phone: '', 
    telegram: '' 
  });
  const [saving, setSaving] = useState(false);

  // AI генерация
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTaskCount, setAiTaskCount] = useState('10');
  const [aiDifficulty, setAiDifficulty] = useState('none');

  useEffect(() => {
    const sessionData = localStorage.getItem('edu_session');
    if (!sessionData) return navigate('/login');

    const { token } = JSON.parse(sessionData);
    if (!token) return navigate('/login');

    const config = { headers: { 'Authorization': `Bearer ${token}` } };

    Promise.all([
      axios.get('https://tests-production-46d5.up.railway.app/student/tests', config),
      axios.get('https://tests-production-46d5.up.railway.app/student/my-assignments', config).catch(() => ({ data: [] })),
      axios.get('https://tests-production-46d5.up.railway.app/student/ai-tests', config).catch(() => ({ data: [] })),
      axios.get('https://tests-production-46d5.up.railway.app/student/me', config),
      axios.get('https://tests-production-46d5.up.railway.app/student/history', config)
    ])
    .then(([testsRes, assignmentsRes, aiRes, profileRes, historyRes]) => {
      setStaticTests(testsRes.data);
      
      const customTestsData = (assignmentsRes.data || []).map(a => {
  return {
    id: a.test_id,
    title: a.test_title,
    target_class: a.target_class || '',        // ← из assignments
    target_topic: a.target_topic || '',        // ← из assignments
    subject: a.subject || '',                  // ← из assignments
    tasks: a.tasks || [],                      // ← из assignments
    is_assigned: true,
    due_date: a.due_date,
    is_completed: a.is_completed,
    assignment_id: a.assignment_id,
    is_autocompile: a.is_autocompile
  };
});
      setCustomTests(customTestsData);
      
      setAiTests((aiRes.data || []).map(t => ({
        ...t,
        is_ai: true
      })));
      
      setProfile(profileRes.data);
      setHistory(historyRes.data);
      setEditForm({
        first_name: profileRes.data.user.first_name || '',
        last_name: profileRes.data.user.last_name || '',
        phone: profileRes.data.user.phone || '',
        telegram: profileRes.data.user.tg_username || ''
      });
      setLoading(false);
    })
    .catch(err => {
      if (err.response?.status === 401) navigate('/login');
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const dataToSubmit = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone,
      tg_username: editForm.telegram
    };

    try {
      const { token } = JSON.parse(localStorage.getItem('edu_session'));
      const res = await axios.put('https://tests-production-46d5.up.railway.app/student/me', dataToSubmit, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProfile(prev => ({ ...prev, user: res.data }));
      alert("Данные сохранены!");
    } catch (err) {
      console.error(err);
      alert("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleStartTest = (test) => {
    if (test.is_ai) {
      navigate(`/test/${test.id}?type=ai`);
    } else if (test.assignment_id) {
      navigate(`/test/${test.id}?assignment=${test.assignment_id}`);
    } else {
      navigate(`/test/${test.id}`);
    }
  };

  const handleGenerateAiTest = async () => {
  if (!aiPrompt.trim()) return;
  
  setAiGenerating(true);
  try {
    const { token } = JSON.parse(localStorage.getItem('edu_session'));
    const res = await axios.post(
      'https://tests-production-46d5.up.railway.app/student/generate-test',
      { 
        prompt: aiPrompt,
        task_count: parseInt(aiTaskCount),
        difficulty: aiDifficulty === "none" ? null : aiDifficulty, // если "none" → null
        target_class: selectedClass !== 'Все' ? selectedClass : null
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    // Закрываем модалку
    setShowAiModal(false);
    setAiPrompt('');
    
    // Редиректим на тест
    const newTest = res.data;
    navigate(`/test/${newTest.id}?type=ai`);
    
  } catch (err) {
    console.error('Ошибка генерации:', err);
    alert('Не удалось сгенерировать тест. Попробуйте другой запрос.');
  } finally {
    setAiGenerating(false);
  }
};
  // После существующих функций

const fetchTheoryTopics = async () => {
  try {
    const { token } = JSON.parse(localStorage.getItem('edu_session'));
    const res = await axios.get('https://tests-production-46d5.up.railway.app/student/theory/topics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTheoryTopics(res.data);
  } catch (err) {
    console.error('Ошибка загрузки тем:', err);
  }
};

const fetchTheorySections = async (topic) => {
  try {
    const { token } = JSON.parse(localStorage.getItem('edu_session'));
    const res = await axios.get(`https://tests-production-46d5.up.railway.app/student/theory/sections/${topic}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error('Ошибка загрузки разделов:', err);
    return [];
  }
};

const fetchTheoryByTopicSection = async (topic, section) => {
  setTheoryLoading(true);
  try {
    const { token } = JSON.parse(localStorage.getItem('edu_session'));
    const res = await axios.get(`https://tests-production-46d5.up.railway.app/student/theory/by-topic/${topic}/section/${section}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTheoryContent(res.data);
    setSelectedTopic(topic);
    setSelectedSection(section);
  } catch (err) {
    console.error('Ошибка загрузки теории:', err);
    setTheoryContent(null);
  } finally {
    setTheoryLoading(false);
  }
};

const handleTopicClick = async (topic) => {
  const sections = await fetchTheorySections(topic.topic);
  if (sections.length === 1) {
    fetchTheoryByTopicSection(topic.topic, sections[0].section);
  } else if (sections.length > 1) {
    setSectionsForModal(sections);
    setSelectedTopic(topic);
    setShowSectionModal(true);
  }
};

const handleBackToTopics = () => {
  setSelectedSection(null);
  setTheoryContent(null);
  setSelectedTopic(null);
};

// Добавьте в существующий useEffect или создайте новый
useEffect(() => {
  if (activeTab === 'theory') {
    fetchTheoryTopics();
  }
}, [activeTab]);

  // ==================== ЛОГИКА ИЕРАРХИИ ====================
  
  // 1. Общие тесты = только autocompile (is_autocompile !== false)
  const publicStaticTests = staticTests.filter(t => t.is_autocompile !== false);
  
  // 2. Тесты от учителя = назначенные + статические НЕ autocompile
  const teacherTests = [
    ...customTests.map(t => ({ ...t, type: 'custom' })),
    ...staticTests.filter(t => t.is_autocompile === false).map(t => ({ ...t, type: 'custom' }))
  ];
  
  // 3. AI тесты
  const aiTestsMapped = aiTests.map(t => ({ ...t, type: 'ai' }));

  // Все тесты
  const allTests = [
    ...publicStaticTests.map(t => ({ ...t, type: 'static' })),
    ...teacherTests,
    ...aiTestsMapped
  ];

  // Количества
  const publicStaticCount = publicStaticTests.length;
  const teacherTestsCount = teacherTests.length;
  const aiTestsCount = aiTestsMapped.length;
  const allTestsCount = allTests.length;

  // Фильтрация по типу
  const typeFilteredTests = testTypeFilter === 'all' 
    ? allTests 
    : testTypeFilter === 'static'
      ? publicStaticTests.map(t => ({ ...t, type: 'static' }))
      : testTypeFilter === 'custom'
        ? teacherTests
        : aiTestsMapped;

  // Уникальные классы
  const uniqueClasses = [...new Set(typeFilteredTests.map(t => t.target_class || "Общие"))]
    .sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;
      return a.localeCompare(b);
    })
    .filter(cls => cls.toString().toLowerCase().includes(classSearch.toLowerCase()));

  // Тесты выбранного класса
  const classTests = selectedClass 
    ? typeFilteredTests.filter(t => (t.target_class || "Общие") === selectedClass)
    : [];

  // Предметы/темы
  const subjects = selectedClass 
    ? ['Все', ...new Set(classTests.map(t => t.subject || t.target_topic || "Общее").filter(Boolean))]
    : [];

  // Итоговые тесты
  const displayTests = (selectedSubject === 'Все' || !selectedSubject)
    ? classTests
    : classTests.filter(t => (t.subject || t.target_topic || "Общее") === selectedSubject);

  // Поиск
  const searchedTests = testSearch.trim()
    ? displayTests.filter(t => 
        t.title?.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.subject?.toLowerCase().includes(testSearch.toLowerCase())
      )
    : displayTests;

  // История
  const filteredHistory = history.filter(item =>
    item.test_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="font-black uppercase tracking-widest text-slate-400 text-[10px]">Загрузка тестов...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* НАВИГАЦИЯ */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-blue-600" />
            <span className="text-sm font-black uppercase text-slate-800 hidden md:inline">
              {profile?.user.first_name} {profile?.user.last_name}
            </span>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.25rem] border border-slate-100">
            {['theory', 'tests', 'history', 'profile'].map((tab) => (
  <button 
    key={tab}
    onClick={() => setActiveTab(tab)}
    className={`relative px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
      activeTab === tab 
        ? 'text-white' 
        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/50'
    }`}
  >
    {activeTab === tab && (
      <div className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 animate-in fade-in zoom-in duration-300"></div>
    )}
    <span className="relative z-10 whitespace-nowrap">
      {tab === 'theory' ? 'Теория' : tab === 'tests' ? 'Тесты' : tab === 'history' ? 'История' : 'Профиль'}
    </span>
  </button>
))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* ==================== ВКЛАДКА: ТЕСТЫ ==================== */}
{/* ==================== ВКЛАДКА: ТЕСТЫ ==================== */}
{activeTab === 'tests' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

    {/* --- 1. ВЕРХНЯЯ ПАНЕЛЬ --- */}
    <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Доступные тесты
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {testTypeFilter === 'all' 
              ? `${allTestsCount} тестов доступно`
              : testTypeFilter === 'static'
                ? `${publicStaticCount} общих тестов`
                : `${teacherTestsCount} тестов от учителя`
            }
          </p>
        </div>
      </div>
    </div>

    {/* --- 2. ФИЛЬТРЫ ПО ТИПУ ТЕСТОВ --- */}
<div className="flex justify-center">
  <div className="flex flex-wrap gap-2 w-full max-w-2xl">
    {[
      { 
        key: 'all', 
        label: 'Все', 
        icon: '📚',
        activeColor: 'bg-slate-800',
        badgeColor: 'bg-slate-700'
      },
      { 
        key: 'static', 
        label: 'Общие', 
        icon: '📖',
        activeColor: 'bg-blue-600',
        badgeColor: 'bg-blue-500'
      },
      { 
        key: 'custom', 
        label: 'Учительские', 
        icon: '👨‍🏫',
        activeColor: 'bg-emerald-600',
        badgeColor: 'bg-emerald-500'
      }
    ].map(filter => {
      const count = filter.key === 'all' 
        ? allTestsCount 
        : filter.key === 'static' 
          ? publicStaticCount 
          : teacherTestsCount;
      
      return (
        <button
          key={filter.key}
          onClick={() => {
            setTestTypeFilter(filter.key);
            setSelectedClass(null);
            setSelectedSubject('Все');
            setTestSearch('');
          }}
          className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 min-w-[100px] ${
            testTypeFilter === filter.key
              ? `${filter.activeColor} text-white shadow-md`
              : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300'
          }`}
        >
          <span>{filter.icon}</span>
          <span>{filter.label}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-lg ${
            testTypeFilter === filter.key 
              ? `${filter.badgeColor} text-white` 
              : 'bg-slate-100 text-slate-400'
          }`}>
            {count}
          </span>
        </button>
      );
    })}
  </div>
</div>

    {/* --- 3. ОСНОВНОЙ БЛОК --- */}
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      
      {/* Левая панель — Разделы */}
      <aside className="w-full md:w-64 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Filter size={14} /> Раздел
        </h3>
        
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Поиск раздела..."
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 py-2.5 pl-9 pr-4 rounded-xl text-xs font-bold outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto max-h-[40vh] md:max-h-[60vh]">
          {uniqueClasses.length > 0 ? uniqueClasses.map(cls => {
            const count = typeFilteredTests.filter(t => (t.target_class || "Общие") === cls).length;
            const isActive = selectedClass === cls;
            
            // Проверяем, есть ли в этом разделе учительские тесты
            const hasTeacherTests = typeFilteredTests.some(t => 
              (t.target_class || "Общие") === cls && t.type === 'custom'
            );
            
            return (
              <button 
                key={cls} 
                onClick={() => { setSelectedClass(cls); setSelectedSubject('Все'); setTestSearch(''); }}
                className={`shrink-0 flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {hasTeacherTests && testTypeFilter === 'all' && (
                    <span className="text-[14px]">👨‍🏫</span>
                  )}
                  <span className="font-bold text-xs uppercase">{cls}</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-400'
                }`}>{count}</span>
              </button>
            );
          }) : (
            <p className="text-[10px] font-bold text-slate-400 text-center py-10 italic">
              {classSearch ? 'Ничего не найдено' : 'Нет разделов'}
            </p>
          )}
        </div>
      </aside>

      {/* Правая часть — контент */}
      <main className="flex-1 p-5 md:p-8 bg-white overflow-y-auto">
        {!selectedClass ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center">
              {testTypeFilter === 'static' && <BookOpen size={40} className="text-blue-200" />}
              {testTypeFilter === 'custom' && <Users size={40} className="text-emerald-200" />}
              {testTypeFilter === 'all' && <GraduationCap size={40} className="text-slate-200" />}
            </div>
            <h3 className="text-lg font-black uppercase text-slate-300">Выберите раздел</h3>
            <p className="text-xs font-bold text-slate-300 max-w-xs">
              Слева отображаются разделы с доступными тестами
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            {/* Хлебные крошки + поиск */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap text-xs font-black uppercase text-slate-500">
                <button onClick={() => { setSelectedClass(null); setSelectedSubject('Все'); }}>
                  <ChevronRight size={14} className="rotate-180 text-slate-300 hover:text-slate-600" />
                </button>
                <span className={`px-2 py-1 rounded-lg ${
                  testTypeFilter === 'static' ? 'bg-blue-50 text-blue-600' :
                  testTypeFilter === 'custom' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {testTypeFilter === 'static' ? 'Общие' : testTypeFilter === 'custom' ? 'Учительские' : 'Все'}
                </span>
                <ChevronRight size={12} />
                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{selectedClass}</span>
                {selectedSubject !== 'Все' && (
                  <>
                    <ChevronRight size={12} />
                    <span className="bg-slate-50 px-2 py-1 rounded-lg">{selectedSubject}</span>
                  </>
                )}
              </div>
              
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск теста..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-400"
                />
                {testSearch && (
                  <button onClick={() => setTestSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Темы */}
            {selectedClass && subjects.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {subjects.map(subject => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                      selectedSubject === subject 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {subject === 'Все' ? '📚 Все' : subject}
                  </button>
                ))}
              </div>
            )}

            {/* Сетка тестов */}
            {searchedTests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {searchedTests.map(test => (
                  <TestCard
                    key={`${test.type}-${test.id}`}
                    test={test}
                    type={test.type}
                    onStart={handleStartTest}
                    disabled={test.is_completed}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto">
                  <Search size={32} className="text-slate-200" />
                </div>
                <p className="font-black text-slate-400 uppercase">
                  {testSearch ? 'Ничего не найдено' : 'Нет тестов'}
                </p>
                <p className="text-[10px] font-bold text-slate-300 uppercase">
                  {testSearch ? 'Попробуйте другой запрос' : 'В этой категории пока пусто'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>

  </div>
)}

        {/* ==================== ВКЛАДКА: ИСТОРИЯ ==================== */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-black uppercase italic flex items-center gap-3 text-slate-950">
                <History size={22} className="text-slate-950"/> История решений
              </h2>
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ПОИСК..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Тест</th>
                    <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Балл</th>
                    <th className="px-6 md:px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length > 0 ? filteredHistory.map((res) => (
                    <tr 
                      key={res.id} 
                      onClick={() => navigate(`/result/${res.id}`)} 
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 md:px-8 py-5 font-black uppercase text-slate-800 text-sm group-hover:text-blue-600">
                        {res.test_title?.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim()}
                      </td>
                      <td className="px-6 md:px-8 py-5 text-center font-black italic text-lg text-blue-600">
                        {res.total_points}
                      </td>
                      <td className="px-6 md:px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="flex items-center gap-2">
                          <Calendar size={12}/> 
                          {new Date(res.completed_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-slate-300 font-black uppercase text-xs">
                        История пуста
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== ВКЛАДКА: ПРОФИЛЬ ==================== */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[3rem] border border-slate-100 p-6 md:p-12 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 z-0" />

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 pb-8 border-b border-slate-50">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-100 transform -rotate-3">
                      <UserIcon size={32} />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                        {profile?.user.first_name} <br/> {profile?.user.last_name}
                      </h2>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        ID: {profile?.user.id || '001'}
                      </p>
                    </div>
                    {/* В секции profile, после блока со статистикой */}
<div className="flex gap-4 mt-6">
  <button
    onClick={() => navigate('/stats/me')}
    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
  >
    <BarChart3 size={16} />
    Детальная статистика
  </button>
</div>
                  </div>

                  <div className="flex gap-8 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-50">
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Сдано</div>
                      <div className="text-2xl font-black text-slate-950">{profile?.stats.total_attempts}</div>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="text-center">
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Успех</div>
                      <div className="text-2xl font-black text-blue-600">{profile?.stats.avg_score}%</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Имя студента</label>
                      <input 
                        type="text" 
                        value={editForm.first_name} 
                        onChange={e => setEditForm({...editForm, first_name: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" 
                      />
                    </div>

                    <div className="group space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Фамилия</label>
                      <input 
                        type="text" 
                        value={editForm.last_name} 
                        onChange={e => setEditForm({...editForm, last_name: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" 
                      />
                    </div>

                    <div className="group space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Контактный телефон</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={16} /></span>
                        <input 
                          type="tel" 
                          placeholder="+7 (000) 000-00-00" 
                          value={editForm.phone} 
                          onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" 
                        />
                      </div>
                    </div>

                    <div className="group space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Telegram аккаунт</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-blue-600">@</span>
                        <input 
                          type="text" 
                          placeholder="username" 
                          value={editForm.telegram} 
                          onChange={e => setEditForm({...editForm, telegram: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={saving} 
                      className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-200 transition-all disabled:bg-slate-200 flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={18} />
                          <span>Обновить профиль</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

{/* ==================== ВКЛАДКА: ТЕОРИЯ ==================== */}
{activeTab === 'theory' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
    
    {/* Верхняя панель */}
    <div className="bg-white rounded-[2.5rem] p-5 md:p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Library size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Теоретический материал
          </h2>
        </div>
      </div>
    </div>

    {/* Если выбран раздел - показываем контент */}
    {selectedSection && theoryContent ? (
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-6">
          {theoryLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <TheoryViewer content={theoryContent.content} />
          )}
        </div>
      </div>
    ) : (
      <>
        {/* Сетка 3 колонки, сколько строк получится */}
        {theoryTopics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {theoryTopics.map((topic) => (
              <TopicCard
                key={topic.topic}
                topic={topic}
                onClick={handleTopicClick}
              />
            ))}
          </div>
        )}

        {/* Если нет тем */}
        {theoryTopics.length === 0 && !theoryLoading && (
          <div className="bg-white rounded-[2.5rem] p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
              <Library size={40} className="text-slate-300" />
            </div>
            <p className="font-black text-slate-400 uppercase">Теория пока не добавлена</p>
          </div>
        )}
      </>
    )}

    {/* AI Чат (показываем только когда выбран раздел) */}
    {selectedSection && theoryContent && (
      <TheoryAIChat 
        theoryContent={theoryContent.content}
        topic={selectedTopic?.label || selectedTopic?.topic}
        section={selectedSection}
        theoryId={theoryContent?.id}
      />
    )}

  </div>
)}

{/* ========== ПЛАВАЮЩАЯ КНОПКА "НАЗАД" (снизу слева) ========== */}
{selectedSection && theoryContent && (
  <button
    onClick={handleBackToTopics}
    className="fixed bottom-6 left-6 z-50 w-12 h-12 md:w-14 md:h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 group"
    title="Назад"
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="group-hover:-translate-x-0.5 transition-transform"
    >
      <path d="m15 18-6-6 6-6"/>
    </svg>
  </button>
)}
      </main>

      {/* ==================== МОДАЛЬНОЕ ОКНО AI ГЕНЕРАЦИИ ==================== */}
{showAiModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase">AI Генерация теста</h3>
              <p className="text-purple-200 text-[10px] font-bold uppercase mt-1">
                Создайте уникальный тест с помощью ИИ
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAiModal(false)}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <XCircle size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
            Опишите тему теста
          </label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Например: квадратные уравнения для 8 класса, задачи на движение, тригонометрия..."
            className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-purple-400 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
              Количество задач (1-30)
            </label>
            <input
  type="number"
  min="1"
  max="30"
  value={aiTaskCount}
  onChange={(e) => {
    const val = e.target.value;
    // Разрешаем пустое значение для удобства ввода
    if (val === '') {
      setAiTaskCount('');
      return;
    }
    
    const num = Number(val);
    // Игнорируем нечисловые значения
    if (isNaN(num)) return;
    
    // Применяем ограничения только к числовым значениям
    if (num < 1) {
      setAiTaskCount(1);
    } else if (num > 30) {
      setAiTaskCount(30);
    } else {
      setAiTaskCount(num);
    }
  }}
  onBlur={() => {
    // Если поле пустое или содержит невалидное значение - ставим 10
    if (aiTaskCount === '' || isNaN(aiTaskCount) || aiTaskCount < 1) {
      setAiTaskCount(10);
    }
  }}
  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all"
/>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
              Сложность
            </label>
            <select 
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none"
            >
              <option value="easy">Лёгкий</option>
              <option value="medium">Средний</option>
              <option value="hard">Сложный</option>
              <option value="none">🍲 Рататуй (любая)</option>
            </select>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-amber-700 uppercase">
            AI может допускать ошибки. Проверяйте сгенерированные задания.
          </p>
        </div>
      </div>

      <div className="p-6 bg-slate-50 flex gap-3">
        <button
          onClick={() => setShowAiModal(false)}
          className="flex-1 p-4 bg-white text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all border border-slate-200"
        >
          ОТМЕНА
        </button>
        <button
          onClick={handleGenerateAiTest}
          disabled={!aiPrompt.trim() || aiGenerating}
          className="flex-1 p-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-purple-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {aiGenerating ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              ГЕНЕРАЦИЯ...
            </>
          ) : (
            <>
              <Zap size={16} />
              СОЗДАТЬ ТЕСТ
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

{/* Модальное окно для выбора раздела (подтемы) - ДОБАВИТЬ СЮДА */}
{showSectionModal && selectedTopic && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-black uppercase">Выберите раздел</h3>
            <p className="text-blue-100 text-[10px] font-bold uppercase mt-1">
              {selectedTopic.label}
            </p>
          </div>
          <button 
            onClick={() => setShowSectionModal(false)}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <XCircle size={20} />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {sectionsForModal.map((section) => (
          <button
            key={section.section}
            onClick={() => {
              fetchTheoryByTopicSection(selectedTopic.topic, section.section);
              setShowSectionModal(false);
            }}
            className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all font-bold text-slate-700"
          >
            {section.section}
          </button>
        ))}
      </div>
    </div>
  </div>
)}


    </div>
  );
}