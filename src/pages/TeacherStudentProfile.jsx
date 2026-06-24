// ==================== TeacherStudentProfile.jsx ====================
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Phone, MessageSquare, History, 
  ArrowRight, Trophy, Target, Calendar, Search,
  Clock, CheckCircle2, ListTodo, BarChart3 
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'https://tests-production-46d5.up.railway.app';

export default function TeacherStudentProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item =>
    item.test_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAuthHeaders = () => {
    try {
      const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token || session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (e) {
      return {};
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        
        const [profileRes, historyRes, assignmentsRes] = await Promise.all([
          axios.get(`${API_BASE}/teacher/students-profile/${userId}`, { headers }),
          axios.get(`${API_BASE}/teacher/students-history/${userId}`, { headers }),
          axios.get(`${API_BASE}/teacher/student/${userId}/assignments`, { headers })
        ]);

        setData(profileRes.data);
        setHistory(historyRes.data);
        setAssignments(assignmentsRes.data);
      } catch (err) {
        console.error("Ошибка:", err);
        if (err.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, navigate]);

  // Для каждого назначения ищем соответствующий результат в истории
  const assignmentsWithResults = useMemo(() => {
    return assignments.map(assignment => {
      // Ищем результат с таким же названием теста (можно заменить на test_id, если будет в history)
      const foundResult = history.find(
        item => item.test_id === assignment.test_id
      );
      return {
        ...assignment,
        result: foundResult?.result || null
      };
    });
  }, [assignments, history]);

  // Сортируем: сначала невыполненные, потом выполненные
  const sortedAssignments = [...assignmentsWithResults].sort((a, b) => {
    const aDone = !!a.result;
    const bDone = !!b.result;
    if (aDone === bDone) return 0;
    return aDone ? 1 : -1;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-sm font-black uppercase text-slate-400 animate-pulse tracking-widest">
          Загрузка профиля...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, stats } = data;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
        
        {/* Навигация */}
        <button 
          onClick={() => navigate('/teacher')} 
          className="group flex items-center gap-2 text-slate-400 hover:text-slate-950 font-black uppercase text-[10px] transition-all"
        >
          <div className="p-2 bg-white rounded-lg border border-slate-100 group-hover:border-slate-200 shadow-sm">
            <ChevronLeft size={14} />
          </div>
          Назад к ученикам
        </button>

        {/* Шапка профиля */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black bg-emerald-600 text-white px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-100">
                Ученик
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                ID: {user.id}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-950 leading-[0.85]">
              {user.first_name} <br /> 
              <span className="text-emerald-600">{user.last_name}</span>
            </h1>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-lg">
              @{user.username}
            </div>
          </div>
          
          {/* Статистика */}
          <div className="flex gap-10 bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm">
                                {/* В секции profile, после блока со статистикой */}
<button
      onClick={() => navigate(`/stats/${user.id}`)}
      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs uppercase hover:bg-blue-100 transition-all flex items-center gap-2"
    >
      <BarChart3 size={14} />
      Статистика
    </button>
            <div className="text-right">
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Средний результат</div>
              <div className="text-5xl font-black text-slate-950 italic">
                {stats.avg_score}<span className="text-emerald-600 text-2xl">%</span>
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
          
          {/* Левая колонка: контакты + назначения */}
          <div className="space-y-6">
            {/* Контакты */}
            <div className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <Target size={14} className="text-emerald-600"/> Контакты
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                    <Phone size={20}/>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-300 uppercase">Телефон</div>
                    <div className="font-bold text-slate-700">{user.phone || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                    <MessageSquare size={20}/>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-300 uppercase">Telegram</div>
                    <div className="font-bold text-emerald-600">
                      {user.tg_username ? `@${user.tg_username}` : 'Не привязан'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Назначенные тесты */}
            <div className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <ListTodo size={14} className="text-blue-600"/> Назначенные тесты
                </h3>
                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {assignments.length}
                </span>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-8 text-slate-300 text-[10px] font-black uppercase tracking-widest">
                  Нет назначений
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {sortedAssignments.map((assignment) => {
                    const isDone = !!assignment.is_completed;
                    const resultId = assignment.result_id;

                    return (
                      <div 
                        key={assignment.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          isDone 
                            ? 'bg-emerald-50/50 border-emerald-100 hover:shadow-md cursor-pointer' 
                            : 'bg-amber-50/50 border-amber-100'
                        }`}
                        onClick={() => {
                          if (isDone && resultId) {
                            navigate(`/teacher/results/${resultId}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-800 truncate flex items-center gap-2">
                              {assignment.test_title}
                              {isDone && assignment.result?.total_points !== undefined && (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                  {assignment.result.total_points} баллов
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {isDone ? (
                                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600">
                                  <CheckCircle2 size={12} /> Выполнен
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[9px] font-black text-amber-600">
                                  <Clock size={12} /> Ожидается
                                </span>
                              )}
                              {assignment.due_date && (
                                <span className="text-[9px] text-slate-400">
                                  до {new Date(assignment.due_date).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                            </div>
                          </div>
                          {isDone && resultId && (
                            <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 transition-all">
                              <ArrowRight size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Статус */}
            <div className="p-8 bg-emerald-600 rounded-[3rem] text-white shadow-xl shadow-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black uppercase opacity-60 tracking-widest">Статус</div>
                <div className="text-xl font-black uppercase italic mt-1">Активен</div>
              </div>
              <Trophy size={32} className="opacity-20" />
            </div>
          </div>

          {/* Правая колонка: история решений */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-black uppercase italic flex items-center gap-3 text-slate-950">
                    <History size={22}/> История решений
                  </h2>
                  <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase">
                    {filteredHistory.length} сессий
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ПОИСК..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-600/10 transition-all placeholder:text-slate-300"
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
                          onClick={() => navigate(`/teacher/results/${item.result.id}`)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-all group"
                        >
                          <td className="px-8 py-6">
                            <div className="font-black uppercase text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">
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
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
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
    </div>
  );
}