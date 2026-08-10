import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Phone, Check, BarChart3, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { fetchMyDetailedStats } from './api';

const DIFF_COLORS = {
  1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  2: 'bg-lime-100 text-lime-700 border-lime-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
  4: 'bg-orange-100 text-orange-700 border-orange-200',
  5: 'bg-red-100 text-red-700 border-red-200',
};

const getDiffColor = (d) => DIFF_COLORS[d] || 'bg-slate-100 text-slate-700 border-slate-200';

const PERIODS = [
  { label: 'За всё время', value: 'all' },
  { label: 'Год', value: 'year' },
  { label: 'Месяц', value: 'month' },
  { label: 'Неделя', value: 'week' },
];

export default function ProfileTab({ profile, editForm, setEditForm, handleUpdateProfile, saving }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState('all');

  const loadStats = async (p) => {
    setStatsLoading(true);
    try {
      const data = await fetchMyDetailedStats(p);
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  };

  const toggleStats = () => {
    const next = !statsOpen;
    setStatsOpen(next);
    if (next && !stats) loadStats(period);
  };

  const handlePeriodChange = (p) => {
    setPeriod(p);
    loadStats(p);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 p-6 md:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-700/50 rounded-full -mr-32 -mt-32 z-0" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 pb-8 border-b border-slate-50 dark:border-slate-700">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-blue-100 transform -rotate-3">
                <UserIcon size={32} />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                  {profile?.user.first_name} <br /> {profile?.user.last_name}
                </h2>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ID: {profile?.user.id || '001'}</p>
              </div>
            </div>
            <div className="flex gap-8 bg-slate-50/50 dark:bg-slate-700/50 p-6 rounded-[2rem] border border-slate-50 dark:border-slate-600">
              <div className="text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Сдано</div>
                <div className="text-2xl font-black text-slate-950 dark:text-white">{profile?.stats.total_attempts}</div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-600" />
              <div className="text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Успех</div>
                <div className="text-2xl font-black text-blue-600">{profile?.stats.avg_score}%</div>
              </div>
            </div>
          </div>

          {/* Stats expander */}
          <div className="mb-8">
            <button
              onClick={toggleStats}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-blue-600" />
                <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">Детальная статистика</span>
              </div>
              {statsOpen ? <ChevronUp size={18} className="text-slate-400 group-hover:text-blue-600" /> : <ChevronDown size={18} className="text-slate-400 group-hover:text-blue-600" />}
            </button>

            {statsOpen && (
              <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-300">
                {/* Period selector */}
                <div className="flex gap-2 flex-wrap">
                  {PERIODS.map(p => (
                    <button key={p.value}
                      onClick={() => handlePeriodChange(p.value)}
                      className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                        period === p.value
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  </div>
                ) : stats ? (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Тестов', value: stats.period.total_tests },
                        { label: 'Правильно', value: stats.period.correct_tasks },
                        { label: 'Задач', value: stats.period.total_tasks },
                        { label: 'Дней серии', value: stats.period.streak_days },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-600">
                          <div className="text-[8px] font-black text-slate-400 uppercase">{s.label}</div>
                          <div className="text-lg font-black text-slate-800 dark:text-white">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Difficulty bars */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">По сложности</h4>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(d => {
                          const item = (stats.difficulties?.difficulties || []).find(x => x.difficulty === d);
                          const total = item?.total_tasks || 0;
                          const correct = item?.correct_tasks || 0;
                          const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                          return (
                            <div key={d} className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${getDiffColor(d)}`}>
                                {d}
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between text-[9px] font-bold mb-0.5">
                                  <span className="text-slate-600">{correct}/{total}</span>
                                  <span className="text-slate-400">{pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                                    style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Topics */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">По темам</h4>
                      <div className="space-y-3">
                        {(stats.topics?.topics || []).slice(0, 10).map(topic => {
                          const pct = topic.mastery_percent || 0;
                          return (
                            <div key={topic.topic}>
                              <div className="flex justify-between text-[9px] font-bold mb-1">
                                <span className="text-slate-700 dark:text-slate-200">{topic.topic}</span>
                                <span className="text-slate-400">{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${pct > 70 ? 'bg-indigo-500' : pct > 40 ? 'bg-violet-400' : 'bg-pink-400'}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                              {topic.sections?.length > 0 && (
                                <div className="mt-1 ml-4 space-y-0.5">
                                  {topic.sections.map(sec => (
                                    <div key={sec.section} className="flex justify-between text-[8px] font-bold">
                                      <span className="text-slate-400">{sec.section}</span>
                                      <span className="text-slate-400">{sec.mastery_percent}%</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase">Нет данных</div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Имя студента</label>
                <input type="text" value={editForm.first_name}
                  onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-700 border-2 border-transparent rounded-2xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600 focus:border-blue-600 outline-none transition-all" />
              </div>
              <div className="group space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Фамилия</label>
                <input type="text" value={editForm.last_name}
                  onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" />
              </div>
              <div className="group space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Контактный телефон</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={16} /></span>
                  <input type="tel" placeholder="+7 (000) 000-00-00" value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" />
                </div>
              </div>
              <div className="group space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Telegram аккаунт</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-blue-600">@</span>
                  <input type="text" placeholder="username" value={editForm.telegram}
                    onChange={e => setEditForm({ ...editForm, telegram: e.target.value })}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none transition-all" />
                </div>
              </div>
            </div>
            <div className="pt-4">
              <button type="submit" disabled={saving}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-200 transition-all disabled:bg-slate-200 flex items-center justify-center gap-3">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (<><Check size={18} /><span>Обновить профиль</span></>)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}