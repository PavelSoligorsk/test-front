import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Phone, Check, BarChart3 } from 'lucide-react';

export default function ProfileTab({ profile, editForm, setEditForm, handleUpdateProfile, saving }) {
  const navigate = useNavigate();

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

          <div className="flex gap-4 mb-8">
            <button onClick={() => navigate('/stats/me')}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <BarChart3 size={16} /> Детальная статистика
            </button>
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
