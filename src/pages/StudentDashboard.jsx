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
  Phone ,
  Check 
} from 'lucide-react';
import axios from 'axios';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests'); 
  
  // Поиск и редактирование
  const [searchTerm, setSearchTerm] = useState('');
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sessionData = localStorage.getItem('edu_session');
    if (!sessionData) return navigate('/login');

    const { token } = JSON.parse(sessionData);
    if (!token) return navigate('/login');

    const config = { headers: { 'Authorization': `Bearer ${token}` } };

    Promise.all([
      axios.get('https://tests-production-46d5.up.railway.app/student/tests', config),
      axios.get('https://tests-production-46d5.up.railway.app/student/me', config),
      axios.get('https://tests-production-46d5.up.railway.app/student/history', config)
    ])
    .then(([testsRes, profileRes, historyRes]) => {
      setTests(testsRes.data);
      setProfile(profileRes.data);
      setHistory(historyRes.data);
      // Внутри useEffect, где загружается профиль
setEditForm({
  first_name: profileRes.data.user.first_name || '',
  last_name: profileRes.data.user.last_name || '',
  phone: profileRes.data.user.phone || '', // Добавили
  telegram: profileRes.data.user.tg_username|| '' // Добавили
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

  // В StudentDashboard.jsx измени ключи в объекте отправки
const handleUpdateProfile = async (e) => {
  e.preventDefault();
  setSaving(true);
  
  // Создаем объект, где ключи точно соответствуют DTO на бэкенде
  const dataToSubmit = {
    first_name: editForm.first_name,
    last_name: editForm.last_name,
    phone: editForm.phone,
    tg_username: editForm.telegram // <--- Важно: мапим telegram на tg_username
  };

  try {
    const { token } = JSON.parse(localStorage.getItem('edu_session'));
    const res = await axios.put('https://tests-production-46d5.up.railway.app/student/me', dataToSubmit, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setProfile(prev => ({ ...prev, user: res.data }));
    alert("Данные сохранены!");
  } catch (err) {
    console.log(err.response.data); // Это покажет в консоли, какое именно поле "упало"
    alert("Ошибка валидации (422)");
  } finally {
    setSaving(false);
  }
};

  const filteredHistory = history.filter(item =>
    item.test_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByClass = tests.reduce((acc, test) => {
    const cl = test.target_class || "Общие";
    if (!acc[cl]) acc[cl] = [];
    acc[cl].push(test);
    return acc;
  }, {});

const [bankClass, setBankClass] = useState(null);
const [selectedSubject, setSelectedSubject] = useState('Все'); // Состояние для параллели/предмета
const [classSearch, setClassSearch] = useState('');

// 1. Получаем уникальные классы
const filteredClasses = [...new Set(tests.map(t => t.target_class || "Общие"))]
  .sort((a, b) => a - b)
  .filter(cls => cls.toString().toLowerCase().includes(classSearch.toLowerCase()));
// 2. Тесты, отфильтрованные по классу
const classTests = tests.filter(t => (t.target_class || "Общие") === bankClass);

// 3. Уникальные предметы внутри выбранного класса (например: Алгебра, Геометрия)
const subjects = ['Все', ...new Set(classTests.map(t => t.subject || "Общее"))];

// 4. Итоговый список тестов для вывода
const displayTests = selectedSubject === 'Все' 
  ? classTests 
  : classTests.filter(t => (t.subject || "Общее") === selectedSubject);
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="font-black uppercase tracking-widest text-slate-400 text-[10px]">Синхронизация данных...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-3">
  <div className="max-w-7xl mx-auto flex justify-between items-center">
    
    {/* ЛОГОТИП С ЭФФЕКТОМ */}
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="relative w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black transform group-hover:rotate-6 transition-transform duration-300">
          E
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-black uppercase tracking-tighter text-lg leading-none">EduSpace</span>
        <span className="text-[8px] font-bold text-blue-600 uppercase tracking-[0.2em] leading-none mt-1">Platform</span>
      </div>
    </div>
    
    {/* ИНТЕРАКТИВНОЕ МЕНЮ */}
    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.25rem] border border-slate-100">
      {['tests', 'history', 'profile'].map((tab) => (
        <button 
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
            activeTab === tab 
              ? 'text-white' 
              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          {/* ФОН АКТИВНОЙ КНОПКИ */}
          {activeTab === tab && (
            <div className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 animate-in fade-in zoom-in duration-300 -z-0"></div>
          )}
          
          <span className="relative z-10">
            {tab === 'tests' ? 'Обучение' : tab === 'history' ? 'История' : 'Профиль'}
          </span>
        </button>
      ))}
    </div>

   
    
  </div>
</nav>

      <main className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        
        {activeTab === 'tests' && (
  <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden min-h-[700px] flex flex-col md:flex-row transition-all">
    
    <aside className="w-full md:w-72 bg-slate-50 border-r border-slate-100 p-8 flex flex-col gap-6 shrink-0">
  <div>
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic px-2">Поиск параллели</h3>
    
    {/* ВВОД ДЛЯ ПОИСКА КЛАССА */}
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
        <Search size={14} />
      </div>
      <input 
        type="text"
        placeholder="Номер класса..."
        value={classSearch}
        onChange={(e) => setClassSearch(e.target.value)}
        className="w-full bg-white border border-slate-200 py-3 pl-10 pr-4 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all"
      />
    </div>

    <div className="flex flex-col gap-3">
      {filteredClasses.length > 0 ? (
        filteredClasses.map(cls => (
          <button 
            key={cls} 
            onClick={() => { setBankClass(cls); setSelectedSubject('Все'); }} 
            className={`group flex items-center justify-between p-5 rounded-[1.5rem] text-left transition-all ${
              bankClass === cls 
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-2' 
              : 'bg-white text-slate-500 border border-slate-100 hover:border-blue-200 hover:translate-x-1'
            }`}
          >
            <span className="font-black text-xs uppercase">{cls} КЛАСС</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
              bankClass === cls ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {tests.filter(t => (t.target_class || "Общие") === cls).length}
            </div>
          </button>
        ))
      ) : (
        <div className="text-[9px] font-bold text-slate-400 uppercase text-center py-4 italic">
          Класс не найден
        </div>
      )}
    </div>
  </div>
</aside>

    {/* ПРАВАЯ ЧАСТЬ: Контент */}
    <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-white">
      {!bankClass ? (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
            <GraduationCap size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase italic text-slate-900">Выберите класс</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">чтобы увидеть список доступных работ</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          
          {/* ШАПКА РАЗДЕЛА */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-slate-50 pb-8">
            <div className="space-y-2">
              <span className="text-blue-600 font-black uppercase text-[9px] tracking-[0.2em]">Выбранный уровень</span>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {bankClass} КЛАСС
              </h2>
            </div>
            
            
          </div>

          {/* СЕТКА СТАЛА ШИРЕ: макс 2 колонки вместо 3 */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {displayTests.length > 0 ? displayTests.map(test => (
    <div 
      key={test.id} 
      onClick={() => navigate(`/test/${test.id}`)}
      className="group relative bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 hover:border-blue-600 hover:bg-white hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
    >
      {/* Декоративный номер темы */}
      <div className="absolute -right-2 -top-2 text-7xl font-black text-slate-200/20 italic group-hover:text-blue-50/50 transition-colors">
        {test.target_topic || '0'}
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-blue-600 group-hover:text-white shadow-sm transition-all duration-300">
            <BookOpen size={20} />
          </div>
        </div>
        
        <div className="space-y-2 mb-8">
          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
            Тема №{test.target_topic || '0'}
          </div>
          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
            {test.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <LayoutGrid size={14} className="text-blue-600"/> 
            <span className="text-[10px] font-black uppercase text-slate-600">
              {test.tasks?.length || 0} задач
            </span>
          </div>
          {/* Можно добавить время, раз места стало больше */}
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={14} />
            <span className="text-[10px] font-black uppercase">45 мин</span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-blue-600 font-black uppercase text-[10px] tracking-[0.2em] group-hover:gap-4 transition-all">
          <span>Начать выполнение</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  )) : (
    <div className="col-span-full py-20 text-center text-slate-300 italic text-xs font-black uppercase tracking-widest">
      Тесты не найдены
    </div>
  )}
</div>
        </div>
      )}
    </main>
  </div>
)}

        {activeTab === 'history' && (
          <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
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
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Тест</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Балл %</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.map((res) => (
                    <tr key={res.id} onClick={() => navigate(`/result/${res.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                      <td className="px-8 py-6 font-black uppercase text-slate-800 text-sm group-hover:text-blue-600">{res.test_title}</td>
                      <td className="px-8 py-6 text-center font-black italic text-lg text-blue-600">{res.total_points}</td>
                      <td className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="flex items-center gap-2"><Calendar size={12}/> {new Date(res.completed_at).toLocaleDateString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

       {activeTab === 'profile' && (
  <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    {/* КАРТОЧКА ПРОФИЛЯ */}
    <div className="bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-sm relative overflow-hidden">
      
      {/* Декоративный фон для аватара */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 z-0" />

      <div className="relative z-10">
        {/* ВЕРХНЯЯ ЧАСТЬ: ИНФО И СТАТИСТИКА */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 pb-8 border-b border-slate-50">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-100 transform -rotate-3">
              <UserIcon size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                {profile?.user.first_name} <br/> {profile?.user.last_name}
              </h2>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ID: {profile?.user.id || '001'}</p>
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

        {/* ФОРМА РЕДАКТИРОВАНИЯ */}
        <form onSubmit={handleUpdateProfile} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Группа: Имя */}
            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Имя студента</label>
              <input 
                type="text" 
                value={editForm.first_name} 
                onChange={e => setEditForm({...editForm, first_name: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" 
              />
            </div>

            {/* Группа: Фамилия */}
            <div className="group space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Фамилия</label>
              <input 
                type="text" 
                value={editForm.last_name} 
                onChange={e => setEditForm({...editForm, last_name: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" 
              />
            </div>

            {/* Группа: Телефон */}
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

            {/* Группа: Telegram */}
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

          {/* КНОПКА СОХРАНЕНИЯ */}
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
      </main>
    </div>
  );
}