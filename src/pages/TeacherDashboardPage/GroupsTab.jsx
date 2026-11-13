import { useState } from 'react';
import { LayoutDashboard, Users, Send, Edit3, Trash2, PlusCircle } from 'lucide-react';
import { Sheet, EmptyState, SearchField, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';
import { HeadingBlock } from '../../shared/ui/HeadingBlock';

export default function GroupsTab({ groups, onOpenCreate, onEdit, onDelete, onManageStudents, onAssignTest, onDetail }) {
  const [groupSearch, setGroupSearch] = useState('');

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Sheet className="p-5 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <HeadingBlock
            icon={<LayoutDashboard size={18} strokeWidth={2} />}
            title="Мои группы"
            titleAs="h3"
            hint={`${groups.length} ${groups.length === 1 ? 'группа' : 'групп'}`}
            extra={(
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={onOpenCreate} className={primaryBtnClass}>
                  <PlusCircle size={14} />
                  Создать
                </button>
                <SearchField className="w-40 sm:w-48" value={groupSearch} onChange={setGroupSearch} placeholder="Поиск..." />
              </div>
            )}
          />
        </div>

        {groups.length === 0 ? (
          <EmptyState framed={false} className="py-16" icon={<LayoutDashboard size={20} />} title="Нет групп" hint="Создайте группу выше" />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50 -mx-5 md:-mx-8">
            {filtered.map((group) => (
              <li
                key={group.id}
                className="px-5 md:px-8 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => onDetail(group)}
                    className="text-left min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white rounded-lg"
                  >
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                      {group.name}
                    </h4>
                    {group.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{group.description}</p>
                    )}
                  </button>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    {group.students_count || group.students?.length || 0} уч.
                  </span>
                </div>
                {group.students && group.students.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {group.students.slice(0, 5).map((s) => (
                      <span
                        key={s.id}
                        className="text-xs font-medium bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-2 py-1 rounded-lg text-zinc-600 dark:text-zinc-300"
                      >
                        {s.first_name} {s.last_name?.charAt(0)}.
                      </span>
                    ))}
                    {group.students.length > 5 && (
                      <span className="text-xs text-zinc-500 font-medium">+{group.students.length - 5}</span>
                    )}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => onManageStudents(group)} className={`${secondaryBtnClass} flex-1 min-w-[7rem] text-xs py-2`}>
                    <Users size={12} /> Студенты
                  </button>
                  <button type="button" onClick={() => onAssignTest(group)} className={`${secondaryBtnClass} flex-1 min-w-[7rem] text-xs py-2`}>
                    <Send size={12} /> Тест
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(group)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(group.id, group.name)}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
