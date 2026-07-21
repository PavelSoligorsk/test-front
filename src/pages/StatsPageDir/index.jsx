import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, TrendingUp, Award, Users, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../../shared/config';

const difficultyLabels = { 1: 'Очень легкий', 2: 'Легкий', 3: 'Средний', 4: 'Сложный', 5: 'Очень сложный' };

export default function StatsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
      const token = session?.token || session?.access_token;
        const url = userId
          ? `${API_URL}/admin/users/${userId}/stats`
          : `${API_URL}/student/stats`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err) {
        console.error('Ошибка загрузки статистики:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="font-black uppercase text-slate-400">Ошибка загрузки</p></div>;

  const stats = data;
  const historyData = stats.history || [];
  const totalPages = Math.max(1, Math.ceil(historyData.length / itemsPerPage));
  const paginatedHistory = historyData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const topicStats = stats.topic_stats || {};

  const tabs = [
    { key: 'overview', label: 'Обзор', icon: BarChart3 },
    { key: 'topics', label: 'Темы', icon: Activity },
    { key: 'history', label: 'История', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center pt-8">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">
            {userId ? 'Статистика ученика' : 'Моя статистика'}
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Анализ успеваемости</p>
        </div>

        <div className="flex justify-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.key ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-blue-600" /></div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.total_tests || 0}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Тестов пройдено</div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center"><Award size={16} className="text-emerald-600" /></div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.avg_score || 0}%</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Средний балл</div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center"><Activity size={16} className="text-violet-600" /></div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.accuracy || 0}%</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Точность</div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center"><Users size={16} className="text-amber-600" /></div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stats.days_active || 0}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Дней активно</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'topics' && Object.keys(topicStats).length > 0 && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Успеваемость по темам</h2>
              <div className="space-y-6">
                {Object.entries(topicStats).map(([topic, stat]) => {
                  const pct = Math.round((stat.correct / stat.total) * 100);
                  return (
                    <div key={topic}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">{topic}</span>
                        <span className="text-[10px] font-black text-slate-400">{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {paginatedHistory.length > 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">История тестов</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {paginatedHistory.map((item, i) => (
                    <div key={i} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{item.test_title}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">{item.completed_at}</p>
                      </div>
                      <div className={`text-sm font-black ${(item.percent || 0) >= 70 ? 'text-emerald-600' : (item.percent || 0) >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {item.score}/{item.max} ({Math.round(item.percent || 0)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="font-black uppercase text-slate-300">История пуста</p>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                  className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[10px] font-black text-slate-400">{currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                  className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
