import React from 'react';
import { Search, Users } from 'lucide-react';
import UserRow from './UserRow';
import { Sheet, IconWell, fieldClass } from '../../shared/ui';

const ROLE_LABELS = { all: 'Все', admin: 'Admin', teacher: 'Teacher', student: 'Student' };

export default function UsersTab({ users, filteredUsers, userSearch, setUserSearch, userRoleFilter, setUserRoleFilter, navigate, onUsersUpdate }) {
  return (
    <Sheet className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <IconWell><Users size={18} strokeWidth={2} /></IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Студенты и состав</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {filteredUsers.length} найдено
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input type="text" placeholder="Поиск..." className={`${fieldClass} pl-10`}
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            {['all', 'admin', 'teacher', 'student'].map(role => (
              <button key={role} type="button" onClick={() => setUserRoleFilter(role)}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  userRoleFilter === role
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}>
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/60 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <th className="px-6 md:px-8 py-3">Пользователь</th>
              <th className="px-6 md:px-8 py-3">Роль</th>
              <th className="px-6 md:px-8 py-3">Преподаватель</th>
              <th className="px-6 md:px-8 py-3 text-right">Управление</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filteredUsers.map(u => (
              <UserRow key={u.id} user={u} users={users} navigate={navigate} onUsersUpdate={onUsersUpdate} />
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}
