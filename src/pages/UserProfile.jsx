import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Phone, 
  MessageSquare, 
  History, 
  ArrowRight, 
  Trophy, 
  Target,
  Calendar,
  Search 
} from 'lucide-react';
import axios from 'axios';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  // 1. Добавь состояние в начало компонента
const [searchTerm, setSearchTerm] = useState('');

// 2. Создай отфильтрованный массив
const filteredHistory = history.filter(item =>
  item.test_title.toLowerCase().includes(searchTerm.toLowerCase())
);

  // Функция для получения заголовков авторизации из твоей сессии
  const getAuthHeaders = () => {
    const session = localStorage.getItem('edu_session');
    if (!session) return {};
    try {
      const { token } = JSON.parse(session);
      return { Authorization: `Bearer ${token}` };
    } catch (e) {
      return {};
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        
        // Загружаем профиль и историю параллельно
        const [profileRes, historyRes] = await Promise.all([
          axios.get(`https://tests-production-46d5.up.railway.app/admin/users/${userId}/profile`, { headers }),
          axios.get(`https://tests-production-46d5.up.railway.app/admin/users/${userId}/history`, { headers })
        ]);

        setData(profileRes.data);
        setHistory(historyRes.data);
      } catch (err) {
        console.error("Ошибка при загрузке:", err);
        if (err.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm font-black uppercase text-slate-400 animate-pulse tracking-widest">
          Загрузка профиля...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, stats } = data;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
      {/* Навигация */}
      <button 
        onClick={() => navigate(-1)} 
        className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 font-black uppercase text-[10px] transition-all"
      >
        <div className="p-2 bg-white rounded-lg border border-slate-100 group-hover:border-slate-200 shadow-sm">
          <ChevronLeft size={14} />
        </div>
        Назад к списку
      </button>

      {/* Шапка профиля */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-100">
              {user.role === 'admin' ? 'Администратор' : 'Студент'}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              ID: {user.id}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-950 leading-[0.85]">
            {user.first_name} <br /> 
            <span className="text-blue-600">{user.last_name}</span>
          </h1>
          <div className="flex items-center gap-2 text-slate-400 font-bold text-lg">
            {user.username}
          </div>
        </div>
        
        <div className="flex gap-10 bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm">
            <div className="text-right">
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Средний результат</div>
                <div className="text-5xl font-black text-slate-950 italic">
                  {stats.avg_score}<span className="text-blue-600 text-2xl">%</span>
                </div>
            </div>
            <div className="w-px bg-slate-100 h-12 self-center" />
            <div className="text-right">
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Попытки</div>
                <div className="text-5xl font-black text-slate-950 italic">{stats.total_attempts}</div>
            </div>
        </div>
      </header>

      {/* Основной контент */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Колонка контактов */}
        <div className="space-y-6">
          <div className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <Target size={14} className="text-blue-600"/> Контактные данные
            </h3>
            
            <div className="space-y-6">
               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    <Phone size={20}/>
                 </div>
                 <div>
                    <div className="text-[9px] font-black text-slate-300 uppercase">Телефон</div>
                    <div className="font-bold text-slate-700">{user.phone || '—'}</div>
                 </div>
               </div>

               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    <MessageSquare size={20}/>
                 </div>
                 <div>
                    <div className="text-[9px] font-black text-slate-300 uppercase">Telegram</div>
                    <div className="font-bold text-blue-600 cursor-pointer">
                      {user.tg_username ? `${user.tg_username}` : 'Не привязан'}
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Карточка достижений (мини) */}
          <div className="p-8 bg-blue-600 rounded-[3rem] text-white shadow-xl shadow-blue-100 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black uppercase opacity-60 tracking-widest">Статус</div>
                <div className="text-xl font-black uppercase italic mt-1">Активен</div>
              </div>
              <Trophy size={32} className="opacity-20 text-white" />
          </div>
        </div>

        <div className="md:col-span-2">
  <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
    <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-black uppercase italic flex items-center gap-3 text-slate-950">
          <History size={22} className="text-slate-950"/> 
          История решений
        </h2>
        <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase">
          {filteredHistory.length} сессий
        </div>
      </div>

      {/* Поле поиска */}
      <div className="relative w-full sm:w-64">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ПОИСК ПО НАЗВАНИЮ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-300"
        />
      </div>
    </div>
    
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Тест</th>
            <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Балл</th>
            <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Дата</th>
            <th className="px-8 py-5 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredHistory.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">
                {searchTerm ? 'Ничего не найдено' : 'Пусто'}
              </td>
            </tr>
          ) : (
            filteredHistory.map((item) => (
              <tr 
                key={item.result.id} 
                onClick={() => navigate(`/admin/results/${item.result.id}`)}
                className="hover:bg-slate-50/80 cursor-pointer transition-all group"
              >
                <td className="px-8 py-6">
                  <div className="font-black uppercase text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                    {item.test_title.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim()}
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tighter">
                    ID {item.result.id}
                  </div>
                </td>
                
                <td className="px-8 py-6 text-center">
                  <span className={`text-lg font-black italic ${
                    item.result.total_points >= 80 ? 'text-emerald-500' : 
                    item.result.total_points >= 50 ? 'text-blue-600' : 
                    'text-red-500'
                  }`}>
                    {item.result.total_points}
                  </span>
                </td>

                <td className="px-8 py-6">
                   <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase">
                        {new Date(item.result.completed_at).toLocaleDateString('ru-RU')}
                      </span>
                   </div>
                </td>

                <td className="px-8 py-6 text-right">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <ArrowRight size={16} />
                  </div>
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
    </div>
  );
}