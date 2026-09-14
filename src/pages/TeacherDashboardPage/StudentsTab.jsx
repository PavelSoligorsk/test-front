import React, { useState } from 'react';
import { Search, ArrowRight, Users } from 'lucide-react';
import { Sheet, IconWell, fieldClass } from '../../shared/ui';

export default function StudentsTab({ students, navigate }) {
  const [studentSearch, setStudentSearch] = useState('');
  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Sheet className="overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <IconWell>
              <Users size={18} strokeWidth={2} />
            </IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Мои ученики
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {filteredStudents.length} {filteredStudents.length === 1 ? 'ученик' : 'учеников'}
              </p>
            </div>
          </div>
        </div>
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Поиск по имени..."
            className={`${fieldClass} pl-10`}
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
        </div>
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
          <div className="py-16 px-6 flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
              <Users size={20} />
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Нет учеников</p>
            <p className="text-sm text-zinc-500">Измените поисковый запрос</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
