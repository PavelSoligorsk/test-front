import { useState } from 'react';
import { ChevronRight, SearchX, Users } from 'lucide-react';
import { ListPage } from '../../shared/ui';

function personName(student) {
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
}

export default function StudentsTab({ students, navigate }) {
  const [studentSearch, setStudentSearch] = useState('');
  const needle = studentSearch.trim().toLowerCase();
  const filtered = students.filter((student) =>
    `${student.first_name} ${student.last_name} ${student.username}`.toLowerCase().includes(needle)
  );

  return (
    <ListPage
      title="Мои ученики"
      hint={`${filtered.length} ${filtered.length === 1 ? 'ученик' : 'учеников'}`}
      search={{ value: studentSearch, onChange: setStudentSearch, placeholder: 'Поиск по имени...' }}
      rows={filtered}
      rowKey={(student) => student.id}
      empty={needle
        ? { icon: <SearchX size={24} strokeWidth={1.5} />, title: 'Ничего не найдено', hint: 'Попробуйте другое имя' }
        : { icon: <Users size={24} strokeWidth={1.5} />, title: 'Нет учеников', hint: 'Ученики появятся, когда их назначат вам' }}
      getRowProps={(student) => ({
        onClick: () => navigate(`/teacher/students/${student.id}`),
        onKeyDown: (e) => { if (e.key === 'Enter') navigate(`/teacher/students/${student.id}`); },
        tabIndex: 0,
        role: 'button',
        'aria-label': `Открыть профиль ${personName(student)}`,
        className: 'group flex cursor-pointer items-center gap-4 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-50 dark:hover:bg-zinc-900/40 dark:focus-visible:bg-zinc-900/40',
      })}
      renderRow={(student) => (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{personName(student)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              @{student.username}
              {student.tg_username ? ` · ${student.tg_username}` : ''}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
        </>
      )}
    />
  );
}
