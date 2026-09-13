import React from 'react';
import { User as UserIcon, Phone, Check } from 'lucide-react';

export default function ProfileTab({ profile, editForm, setEditForm, handleUpdateProfile, saving }) {
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
              <UserIcon size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {profile?.user.first_name} {profile?.user.last_name}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">ID {profile?.user.id || '001'}</p>
            </div>
          </div>
          <div className="flex gap-8 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Сдано</div>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{profile?.stats.total_attempts}</div>
            </div>
            <div className="w-px bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Успех</div>
              <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{profile?.stats.avg_score}%</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-0.5">Имя</label>
              <input
                type="text"
                value={editForm.first_name}
                onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-0.5">Фамилия</label>
              <input
                type="text"
                value={editForm.last_name}
                onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-0.5">Телефон</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><Phone size={16} /></span>
                <input
                  type="tel"
                  placeholder="+375(xx)xxxxxxx"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-0.5">Telegram</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={editForm.telegram}
                  onChange={e => setEditForm({ ...editForm, telegram: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-950/30 border-t-white dark:border-t-zinc-950 rounded-full animate-spin" />
            ) : (<><Check size={16} /><span>Сохранить профиль</span></>)}
          </button>
        </form>
      </div>
    </div>
  );
}
