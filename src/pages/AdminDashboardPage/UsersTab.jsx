import React from 'react';
import { Search } from 'lucide-react';
import UserRow from './UserRow';

export default function UsersTab({ users, filteredUsers, userSearch, setUserSearch, userRoleFilter, setUserRoleFilter, navigate, onUsersUpdate }) {
  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-10 bg-slate-50/50 border-b border-slate-100 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase text-slate-950">Студенты & Состав</h2>
          <span className="text-[10px] font-black text-white bg-blue-600 px-4 py-1.5 rounded-full uppercase">{filteredUsers.length} найдено</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Поиск..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none"
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          <div className="flex bg-slate-200/50 p-1 rounded-2xl">
            {['all', 'admin', 'teacher', 'student'].map(role => (
              <button key={role} onClick={() => setUserRoleFilter(role)}
                className={`flex-1 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${userRoleFilter === role ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400'}`}>
                {role === 'all' ? 'Все' : role}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="p-4 sm:p-8">Пользователь</th>
              <th className="p-4 sm:p-8">Роль</th>
              <th className="p-4 sm:p-8">Преподаватель</th>
              <th className="p-4 sm:p-8 text-right">Управление</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <UserRow key={u.id} user={u} users={users} navigate={navigate} onUsersUpdate={onUsersUpdate} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
