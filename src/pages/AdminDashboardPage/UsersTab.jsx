import { Users } from 'lucide-react';
import UserRow from './UserRow';
import { Sheet, SearchField } from '../../shared/ui';
import { HeadingBlock } from '../../shared/ui/HeadingBlock';

const ROLE_LABELS = { all: 'Все', admin: 'Admin', teacher: 'Teacher', student: 'Student' };

export default function UsersTab({ users, filteredUsers, userSearch, setUserSearch, userRoleFilter, setUserRoleFilter, navigate, onUsersUpdate }) {
  return (
    <Sheet className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <HeadingBlock
            icon={<Users size={18} strokeWidth={2} />}
            title="Студенты и состав"
            hint={`${filteredUsers.length} найдено`}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <SearchField className="flex-1" value={userSearch} onChange={setUserSearch} placeholder="Поиск..." />
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
