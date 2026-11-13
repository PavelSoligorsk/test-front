import { useState } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { Sheet, EmptyState, SearchField } from '../../shared/ui';
import { HeadingBlock } from '../../shared/ui/HeadingBlock';

export default function StudentsTab({ students, navigate }) {
  const [studentSearch, setStudentSearch] = useState('');
  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Sheet className="overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <HeadingBlock
          icon={<Users size={18} strokeWidth={2} />}
          title="Мои ученики"
          hint={`${filteredStudents.length} ${filteredStudents.length === 1 ? 'ученик' : 'учеников'}`}
        />
        <SearchField className="mt-5" value={studentSearch} onChange={setStudentSearch} placeholder="Поиск по имени..." />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-medium text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/60">
              <th className="px-6 md:px-8 py-3">Ученик</th>
              <th className="px-6 md:px-8 py-3">Контакты</th>
              <th className="px-6 md:px-8 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filteredStudents.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
              >
                <td className="px-6 md:px-8 py-4">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">@{student.username}</div>
                </td>
                <td className="px-6 md:px-8 py-4">
                  {student.tg_username ? (
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {student.tg_username}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-6 md:px-8 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/students/${student.id}`)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
                  >
                    <ArrowRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <EmptyState framed={false} className="py-16 px-6" icon={<Users size={20} />} title="Нет учеников" hint="Измените поисковый запрос" />
        )}
      </div>
    </Sheet>
  );
}
