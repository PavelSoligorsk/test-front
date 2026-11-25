import { useState } from 'react';
import { LayoutDashboard, Users, Send, Edit3, Trash2, PlusCircle, SearchX } from 'lucide-react';
import { ListPage, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

const iconBtn = 'inline-flex items-center justify-center rounded-xl bg-zinc-100 p-2 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

export default function GroupsTab({ groups, onOpenCreate, onEdit, onDelete, onManageStudents, onAssignTest, onDetail }) {
  const [groupSearch, setGroupSearch] = useState('');
  const needle = groupSearch.trim().toLowerCase();
  const filtered = groups.filter((group) => group.name.toLowerCase().includes(needle));

  return (
    <ListPage
      title="Мои группы"
      hint={`${filtered.length} ${filtered.length === 1 ? 'группа' : 'групп'}`}
      search={{ value: groupSearch, onChange: setGroupSearch, placeholder: 'Поиск...' }}
      extra={(
        <button type="button" onClick={onOpenCreate} className={primaryBtnClass}>
          <PlusCircle size={14} />
          Создать
        </button>
      )}
      rows={filtered}
      rowKey={(group) => group.id}
      empty={needle
        ? { icon: <SearchX size={24} strokeWidth={1.5} />, title: 'Ничего не найдено', hint: 'Попробуйте другое слово' }
        : { icon: <LayoutDashboard size={24} strokeWidth={1.5} />, title: 'Нет групп', hint: 'Создайте группу кнопкой выше' }}
      getRowProps={() => ({ className: 'transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40' })}
      renderRow={(group) => {
        const count = group.students_count || group.students?.length || 0;
        return (
          <div>
            <div className="mb-3 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onDetail(group)}
                className="min-w-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
              >
                <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{group.name}</p>
                {group.description ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{group.description}</p> : null}
              </button>
              <span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs font-medium tabular-nums text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {count} уч.
              </span>
            </div>
            {group.students?.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {group.students.slice(0, 5).map((student) => (
                  <span key={student.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
                    {student.first_name} {student.last_name?.charAt(0)}.
                  </span>
                ))}
                {group.students.length > 5 ? <span className="text-xs font-medium text-zinc-500">+{group.students.length - 5}</span> : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onManageStudents(group)} className={`${secondaryBtnClass} min-w-[7rem] flex-1 py-2 text-xs`}>
                <Users size={12} /> Студенты
              </button>
              <button type="button" onClick={() => onAssignTest(group)} className={`${secondaryBtnClass} min-w-[7rem] flex-1 py-2 text-xs`}>
                <Send size={12} /> Тест
              </button>
              <button type="button" onClick={() => onEdit(group)} className={iconBtn} aria-label="Изменить группу">
                <Edit3 size={12} />
              </button>
              <button type="button" onClick={() => onDelete(group.id, group.name)} className={`${iconBtn} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30`} aria-label="Удалить группу">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      }}
    />
  );
}
